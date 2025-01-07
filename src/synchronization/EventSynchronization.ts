import { Communicator, ECDSA, GuardDetection } from '@rosen-bridge/tss';
import { Semaphore } from 'await-semaphore';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import {
  ConfirmationStatus,
  ImpossibleBehavior,
  PaymentTransaction,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { isEqual, sampleSize, countBy, shuffle } from 'lodash-es';
import { EventStatus, TransactionStatus } from '../utils/constants';
import {
  ActiveSync,
  SynchronizationMessageTypes,
  SyncRequest,
  SyncResponse,
} from './Interfaces';
import * as TransactionSerializer from '../transaction/TransactionSerializer';
import Configs from '../configs/Configs';
import GuardTurn from '../utils/GuardTurn';
import GuardPkHandler from '../handlers/GuardPkHandler';
import { DatabaseAction } from '../db/DatabaseAction';
import EventVerifier from '../verification/EventVerifier';
import EventSerializer from '../event/EventSerializer';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';
import ChainHandler from '../handlers/ChainHandler';
import EventOrder from '../event/EventOrder';
import DetectionHandler from '../handlers/DetectionHandler';
import { RosenDialerNode } from '@rosen-bridge/dialer';
import RosenDialer from '../communication/RosenDialer';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class EventSynchronization extends Communicator {
  private static instance: EventSynchronization;
  protected static CHANNEL = 'event-synchronization';
  protected static dialer: RosenDialerNode;
  protected detection: GuardDetection;
  protected eventQueue: string[];
  protected activeSyncMap: Map<string, ActiveSync>;
  protected approvalSemaphore: Semaphore;
  protected parallelSyncLimit: number;
  protected parallelRequestCount: number;
  protected requiredApproval: number;

  protected constructor(publicKeys: string[], detection: GuardDetection) {
    super(
      logger,
      new ECDSA(Configs.tssKeys.secret),
      EventSynchronization.sendMessageWrapper,
      publicKeys,
      GuardTurn.UP_TIME_LENGTH
    );
    this.detection = detection;
    this.eventQueue = [];
    this.activeSyncMap = new Map();
    this.approvalSemaphore = new Semaphore(1);
    this.parallelSyncLimit = Configs.parallelSyncLimit;
    this.parallelRequestCount = Configs.parallelRequestCount;
    this.requiredApproval = GuardPkHandler.getInstance().requiredSign - 1;
  }

  /**
   * initializes EventSynchronization
   */
  static init = async () => {
    EventSynchronization.instance = new EventSynchronization(
      Configs.tssKeys.pubs.map((pub) => pub.curvePub),
      DetectionHandler.getInstance().getDetection().curve
    );
    this.dialer = await RosenDialer.getInstance();
    this.dialer.subscribeChannel(
      EventSynchronization.CHANNEL,
      EventSynchronization.instance.messageHandlerWrapper
    );
  };

  /**
   * generates a EventSynchronization object if it doesn't exist
   * @returns EventSynchronization instance
   */
  static getInstance = () => {
    if (!EventSynchronization.instance)
      throw Error(`EventSynchronization instance doesn't exist`);
    return EventSynchronization.instance;
  };

  /**
   * wraps communicator send message to dialer
   * @param msg
   * @param peers
   */
  static sendMessageWrapper = async (msg: string, peers: Array<string>) => {
    if (peers.length === 0) {
      EventSynchronization.dialer.sendMessage(
        EventSynchronization.CHANNEL,
        msg
      );
    } else {
      for (const peerId of peers) {
        EventSynchronization.dialer.sendMessage(
          EventSynchronization.CHANNEL,
          msg,
          peerId
        );
      }
    }
  };

  /**
   * wraps dialer handle message to communicator
   * @param msg
   * @param channel
   * @param peerId
   */
  messageHandlerWrapper = async (
    msg: string,
    channel: string,
    peerId: string
  ) => {
    this.handleMessage(msg, peerId);
  };

  /**
   * adds an event to synchronization queue
   * @param eventId
   */
  addEventToQueue = (eventId: string): void => {
    this.eventQueue.push(eventId);
  };

  /**
   * verifies events in the queue and starts synchronization process for them
   */
  processSyncQueue = async (): Promise<void> => {
    if (this.eventQueue.length === 0) {
      logger.info(`No event to sync`);
      return;
    }

    if (this.activeSyncMap.size >= this.parallelSyncLimit) {
      logger.info(
        `Already syncing for [${this.activeSyncMap.size}] events, [${this.eventQueue.length}] events are waiting for sync in queue`
      );
      return;
    }

    let eventId: string;
    this.eventQueue = shuffle(this.eventQueue);
    while (
      this.eventQueue.length &&
      this.activeSyncMap.size < this.parallelSyncLimit
    ) {
      eventId = this.eventQueue.pop()!;
      const baseError = `Received event [${eventId}] for synchronization but `;

      // check if event is already in synchronization process
      if (this.activeSyncMap.get(eventId)) {
        logger.debug(`event is [${eventId}] is already in synchronization`);
        continue;
      }

      // get event from database
      const eventEntity = await DatabaseAction.getInstance().getEventById(
        eventId
      );
      if (eventEntity === null) {
        logger.warn(baseError + `event is not found`);
        continue;
      }
      const event = EventSerializer.fromConfirmedEntity(eventEntity);

      // check if event is confirmed enough
      if (!(await EventVerifier.isEventConfirmedEnough(event))) {
        logger.warn(baseError + `event is not confirmed enough`);
        continue;
      }

      // get minimum-fee and verify event
      const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);

      // verify event
      if (!(await EventVerifier.verifyEvent(event, feeConfig))) {
        logger.warn(baseError + `but event hasn't verified`);
        await DatabaseAction.getInstance().setEventStatus(
          eventId,
          EventStatus.rejected
        );
        continue;
      }

      // active synchronization for the event
      this.activeSyncMap.set(eventId, {
        timestamp: Math.floor(Date.now() / 1000),
        responses: Array(this.guardPks.length).fill(undefined),
      });
      logger.info(`Activated synchronization for event [${eventId}]`);
    }
  };

  /**
   * gets guard peerId by his index
   * @param index
   */
  protected getPeerIdByIndex = async (
    index: number
  ): Promise<string | undefined> => {
    const pk = this.guardPks[index];
    const activeGuards = await this.detection.activeGuards();
    return activeGuards.find((_) => _.publicKey === pk)?.peerId;
  };

  /**
   * sends requests for all active syncs
   */
  sendSyncBatch = async (): Promise<void> => {
    logger.info(`Sending event synchronization batches`);
    for (const [eventId, activeSync] of this.activeSyncMap) {
      const indexes = activeSync.responses.reduce(
        (
          indexes: number[],
          response: PaymentTransaction | undefined,
          index: number
        ) => {
          if (response === undefined) indexes.push(index);
          return indexes;
        },
        []
      );
      const selectedIndexes = sampleSize(indexes, this.parallelRequestCount);
      logger.debug(
        `Sending sync request for event [${eventId}] to guards [${indexes.join(
          ','
        )}]`
      );

      const selectedPeers = (
        await Promise.all(selectedIndexes.map(this.getPeerIdByIndex))
      ).filter((_) => _) as string[];
      logger.info(
        `Sending sync request for event [${eventId}] to peers [${selectedPeers.join(
          ','
        )}]`
      );
      if (selectedPeers.length === 0) continue;

      const payload: SyncRequest = { eventId: eventId };
      await this.sendMessage(
        SynchronizationMessageTypes.request,
        payload,
        selectedPeers,
        Math.round(Date.now() / 1000)
      );
    }
  };

  /**
   * handles received message from event-synchronization channel
   * @param type
   * @param payload
   * @param signature
   * @param senderIndex
   * @param peerId
   * @param timestamp
   */
  processMessage = async (
    type: string,
    payload: unknown,
    signature: string,
    senderIndex: number,
    peerId: string,
    timestamp: number
  ): Promise<void> => {
    try {
      switch (type) {
        case SynchronizationMessageTypes.request: {
          const request = payload as SyncRequest;
          await this.processSyncRequest(
            request.eventId,
            senderIndex,
            timestamp,
            peerId
          );
          break;
        }
        case SynchronizationMessageTypes.response: {
          const response = payload as SyncResponse;
          const tx = TransactionSerializer.fromJson(response.txJson);
          await this.processSyncResponse(tx, senderIndex);
          break;
        }
        default:
          logger.warn(
            `Received unexpected message type [${type}] in event-synchronization channel`
          );
      }
    } catch (e) {
      logger.warn(
        `An error occurred while handling event-synchronization message: ${e}}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * checks if such event exists and has a completed tx in type of payment
   * sends the tx if so, otherwise does nothing
   * @param eventId
   * @param senderIndex index of the guard that sent the request
   * @param timestamp
   * @param receiver the guard who will receive this response
   */
  protected processSyncRequest = async (
    eventId: string,
    senderIndex: number,
    timestamp: number,
    receiver: string
  ): Promise<void> => {
    const baseError = `Sync request received for event [${eventId}] but `;
    // get event from database
    const eventEntity = await DatabaseAction.getInstance().getEventById(
      eventId
    );
    if (eventEntity === null) {
      logger.warn(baseError + `event is not found`);
      return;
    }

    // check if event has completed tx in type of payment
    const eventTxs = await DatabaseAction.getInstance().getEventValidTxsByType(
      eventId,
      TransactionType.payment
    );
    if (eventTxs.length === 0) {
      logger.info(baseError + `event has no valid transaction`);
      return;
    } else if (eventTxs.length === 1) {
      const txEntity = eventTxs[0];
      if (txEntity.status === TransactionStatus.completed) {
        logger.info(
          `Sending tx [${txEntity.txId}] for syncing event [${eventId}] to guard [${senderIndex}]`
        );
        // send response to sender guard
        const payload: SyncResponse = { txJson: txEntity.txJson };
        await this.sendMessage(
          SynchronizationMessageTypes.response,
          payload,
          [receiver],
          timestamp
        );
      } else {
        logger.info(
          baseError +
            `tx [${txEntity.txId}] is not completed yet (in status [${txEntity.status}])`
        );
        return;
      }
    } else {
      throw new ImpossibleBehavior(
        `event [${eventId}] has [${
          eventTxs.length
        }] valid transactions for type payment: [${eventTxs
          .map((_) => _.txId)
          .join(',')}]`
      );
    }
  };

  /**
   * verifies the sync response sent by other guards, save the transaction if its verified
   * @param tx the payment transaction id
   * @param senderIndex index of the guard that sent the response
   */
  protected processSyncResponse = async (
    tx: PaymentTransaction,
    senderIndex: number
  ): Promise<void> => {
    if (!(await this.verifySynchronizationResponse(tx))) return;
    logger.info(
      `Guard [${senderIndex}] responded the sync request of event [${tx.eventId}] with transaction [${tx.txId}]`
    );

    await this.approvalSemaphore.acquire().then(async (release) => {
      try {
        const activeSync = this.activeSyncMap.get(tx.eventId);
        if (activeSync) {
          activeSync.responses[senderIndex] = tx;
          const occurrences = countBy(activeSync.responses.filter((_) => _));

          if (
            Math.max(...Object.values(occurrences)) >= this.requiredApproval
          ) {
            logger.info(
              `The majority of guards responded the sync request of event [${tx.eventId}] with transaction [${tx.txId}]`
            );
            await this.setTxAsApproved(tx);
          } else {
            logger.debug(
              `event [${tx.eventId}] sync status is: [${JSON.stringify(
                activeSync.responses.map((_) => _?.txId)
              )}]`
            );
          }
        }
        release();
      } catch (e) {
        release();
        throw e;
      }
    });
  };

  /**
   * verifies the transaction sent by other guards for synchronization
   * conditions:
   * - there is a request for this event
   * - tx type is payment
   * - PaymentTransaction object consistency is verified
   * - tx order is equal to expected event order
   * - tx is confirmed enough
   * - tx satisfies the chain conditions
   * @param tx
   * @returns true if transaction verified
   */
  protected verifySynchronizationResponse = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const baseError = `Received tx [${tx.txId}] for syncing event [${tx.eventId}] but `;
    // verify sync request
    const activeSync = this.activeSyncMap.get(tx.eventId);
    if (!activeSync) {
      logger.info(baseError + `sync request for this event is not active`);
      return false;
    }

    // get event from database
    const eventEntity = await DatabaseAction.getInstance().getEventById(
      tx.eventId
    );
    if (eventEntity === null) {
      throw new ImpossibleBehavior(baseError + `event is not found`);
    }
    const event = EventSerializer.fromConfirmedEntity(eventEntity);

    // verify tx type
    if (tx.txType !== TransactionType.payment) {
      logger.warn(baseError + `transaction type is unexpected (${tx.txType})`);
      return false;
    }

    // verify PaymentTransaction object consistency
    const chain = ChainHandler.getInstance().getChain(tx.network);
    if (!(await chain.verifyPaymentTransaction(tx))) {
      logger.warn(baseError + `tx object has inconsistency`);
      return false;
    }

    // verify tx order
    const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);
    const txOrder = chain.extractTransactionOrder(tx);
    const expectedOrder = await EventOrder.createEventPaymentOrder(
      event,
      feeConfig,
      []
    );
    if (!isEqual(txOrder, expectedOrder)) {
      logger.warn(baseError + `tx extracted order is not verified`);
      return false;
    }

    // check if tx is confirmed enough
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.txType
    );
    if (txConfirmation === ConfirmationStatus.NotConfirmedEnough) {
      logger.warn(baseError + `tx is not confirmed enough`);
      return false;
    } else if (txConfirmation === ConfirmationStatus.NotFound) {
      logger.warn(baseError + `tx is not found`);
      return false;
    }

    // check chain-specific conditions
    if (!chain.verifyTransactionExtraConditions(tx, SigningStatus.Signed)) {
      logger.warn(baseError + `extra conditions are not verified`);
      return false;
    }

    return true;
  };

  /**
   * inserts the transaction as completed into db and updates the event
   * @param tx
   */
  protected setTxAsApproved = async (tx: PaymentTransaction): Promise<void> => {
    const dbAction = DatabaseAction.getInstance();
    const txRecord = await dbAction.getTxById(tx.txId);
    const event = await dbAction.getEventById(tx.eventId);
    try {
      if (event === null) {
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] is approved as event [${tx.eventId}] payment but event is not found`
        );
      }
      if (txRecord !== null) {
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] is already in database with status [${txRecord.status}]`
        );
      }

      await dbAction.insertCompletedTx(
        tx,
        event,
        GuardPkHandler.getInstance().requiredSign,
        null
      );
      await DatabaseAction.getInstance().setEventStatusToPending(
        tx.eventId,
        EventStatus.pendingReward
      );
      this.activeSyncMap.delete(tx.eventId);
    } catch (e) {
      logger.warn(
        `An error occurred while finalizing event [${tx.eventId}] synchronization: ${e}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * deletes active event syncs that are timed out
   */
  timeoutActiveSyncs = async (): Promise<void> => {
    await this.approvalSemaphore.acquire().then(async (release) => {
      logger.info(`Clearing active event synchronizations`);
      try {
        for (const [eventId, activeSync] of this.activeSyncMap) {
          if (
            Math.floor(Date.now() / 1000) - activeSync.timestamp >=
            Configs.eventSyncTimeout
          ) {
            logger.info(`event [${eventId}] synchronization is timed out`);
            this.activeSyncMap.delete(eventId);
          }
        }
        release();
      } catch (e) {
        release();
        throw e;
      }
    });
  };
}

export default EventSynchronization;
