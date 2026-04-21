import { randomBytes } from 'crypto';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { Communicator } from '@rosen-bridge/communication';
import { RosenDialerNode } from '@rosen-bridge/dialer';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { NotFoundError } from '@rosen-chains/abstract-chain';

import RosenDialer from '../communication/rosenDialer';
import Configs from '../configs/configs';
import { DatabaseAction } from '../db/databaseAction';
import { EventStatus } from '../utils/constants';
import GuardTurn from '../utils/guardTurn';
import {
  ReprocessMessageTypes,
  ReprocessRequest,
  ReprocessResponse,
  ReprocessStatus,
} from './interfaces';

const logger = DefaultLogger.getInstance().child(import.meta.url);

class EventReprocess extends Communicator {
  private static instance: EventReprocess;
  protected static CHANNEL = 'event-reprocess';
  protected static dialer: RosenDialerNode;
  protected reprocessCooldown: number;

  protected constructor() {
    super(
      logger,
      Configs.tssKeys.encryptor,
      EventReprocess.sendMessageWrapper,
      Configs.tssKeys.pubs.map((pub) => pub.curvePub),
      GuardTurn.UP_TIME_LENGTH,
    );
    this.reprocessCooldown = Configs.eventReprocessCooldown;
  }

  /**
   * initializes EventReprocess
   */
  static init = async () => {
    EventReprocess.instance = new EventReprocess();
    this.dialer = RosenDialer.getInstance().getDialer();
    this.dialer.subscribeChannel(
      EventReprocess.CHANNEL,
      EventReprocess.instance.messageHandlerWrapper,
    );
  };

  /**
   * generates a EventReprocess object if it doesn't exist
   * @returns EventReprocess instance
   */
  static getInstance = () => {
    if (!EventReprocess.instance)
      throw Error(`EventReprocess instance doesn't exist`);
    return EventReprocess.instance;
  };

  /**
   * wraps communicator send message to dialer
   * @param msg
   * @param peers
   */
  static sendMessageWrapper = async (msg: string, peers: Array<string>) => {
    if (peers.length === 0) {
      EventReprocess.dialer.sendMessage(EventReprocess.CHANNEL, msg);
    } else {
      for (const peerId of peers) {
        EventReprocess.dialer.sendMessage(EventReprocess.CHANNEL, msg, peerId);
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
    peerId: string,
  ) => {
    this.handleMessage(msg, peerId);
  };

  /**
   * updates event status and sends reprocess request to other guards
   * @param eventTxId
   * @param peerIds
   */
  sendReprocessRequest = async (
    eventTxId: string,
    peerIds: string[],
  ): Promise<void> => {
    const requestId = randomBytes(8).toString('hex');
    const timestamp = Math.round(Date.now() / 1000);
    // get event from database
    const dbAction = DatabaseAction.getInstance();
    const eventData = await dbAction.getEventByTriggerId(eventTxId);
    if (eventData === null) {
      throw new NotFoundError(`No event found with trigger tx [${eventTxId}]`);
    }

    // check event status
    await this.checkAndApplyReprocess(
      eventData,
      `Only sending reprocess to other guards as `,
    );

    await dbAction.insertReprocessRequests(
      EventReprocess.dialer.getDialerId(),
      requestId,
      eventTxId,
      timestamp,
      peerIds,
    );

    const payload: ReprocessRequest = {
      requestId: requestId,
      eventTxId: eventTxId,
    };
    await this.sendMessage(
      ReprocessMessageTypes.request,
      payload,
      peerIds,
      timestamp,
    );
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
    timestamp: number,
  ): Promise<void> => {
    try {
      switch (type) {
        case ReprocessMessageTypes.request: {
          const request = payload as ReprocessRequest;
          await this.processReprocessRequest(
            request.requestId,
            request.eventTxId,
            timestamp,
            peerId,
          );
          break;
        }
        case ReprocessMessageTypes.response: {
          const response = payload as ReprocessResponse;
          await this.processReprocessResponse(
            response.requestId,
            response.ok,
            peerId,
          );
          break;
        }
        default:
          logger.warn(
            `Received unexpected message type [${type}] in event-synchronization channel`,
          );
      }
    } catch (e) {
      logger.warn(
        `An error occurred while handling event-synchronization message: ${e}}`,
      );
      logger.warn(e.stack);
    }
  };

  /**
   * checks if event status is allowed to reprocess
   * sends ok and updates the status, otherwise does nothing
   * @param requestId
   * @param eventTxId
   * @param timestamp
   * @param peerId the guard who sent the request
   */
  protected processReprocessRequest = async (
    requestId: string,
    eventTxId: string,
    timestamp: number,
    peerId: string,
  ): Promise<void> => {
    const baseError = `Reprocess request [${requestId}] is received for event triggered in tx [${eventTxId}] but `;
    // get event from database
    const dbAction = DatabaseAction.getInstance();
    const eventData = await dbAction.getEventByTriggerId(eventTxId);
    if (eventData === null) {
      logger.warn(baseError + `no event found with trigger tx [${eventTxId}]`);
      return;
    }

    // check how many requests this guard sent recently
    const requests = await dbAction.getRecentReprocessRequestsByGuard(
      peerId,
      Math.round(Date.now() / 1000) - this.reprocessCooldown,
    );
    if (requests.length > 0) {
      logger.warn(
        baseError +
          `guard [${peerId}] has already sent request in previous [${Math.round(
            this.reprocessCooldown / 60,
          )}] minutes`,
      );
      return;
    }

    // check event status
    const result = await this.checkAndApplyReprocess(eventData, baseError);
    if (!result) return;

    // add request to database
    await dbAction.insertReprocessRequests(
      peerId,
      requestId,
      eventTxId,
      timestamp,
      [EventReprocess.dialer.getDialerId()],
    );

    // sending ok to receiver
    const payload: ReprocessResponse = { ok: true, requestId: requestId };
    await this.sendMessage(
      ReprocessMessageTypes.response,
      payload,
      [peerId],
      timestamp,
    );
    logger.debug(
      `OK response for reprocess request [${requestId}] is sent to peer [${peerId}]`,
    );
  };

  /**
   * verifies the reprocess response sent by other guards and updates its status in database
   * @param requestId
   * @param ok is request accepted or not
   * @param peerId the guard who sent the response
   */
  protected processReprocessResponse = async (
    requestId: string,
    ok: boolean,
    peerId: string,
  ): Promise<void> => {
    if (!ok) return;
    logger.info(`Guard [${peerId}] accepted reprocess request [${requestId}]`);

    await DatabaseAction.getInstance().updateReprocessRequest(
      requestId,
      EventReprocess.dialer.getDialerId(),
      peerId,
      ReprocessStatus.accepted,
    );
  };

  /**
   * checks and apply the request if the event status is allowed for reprocess
   * otherwise logs the given message
   * @param eventData
   * @param messageOnDenial the message to be logged if the status is not allowed for reprocess
   * @returns if reprocess is applied
   */
  protected checkAndApplyReprocess = async (
    eventData: EventTriggerEntity,
    messageOnDenial?: string,
  ): Promise<boolean> => {
    const dbAction = DatabaseAction.getInstance();
    const eventId = eventData.eventId;
    const eventEntity = await dbAction.getEventById(eventData.eventId);
    if (eventEntity) {
      // trigger is verified. checking it's status for update
      // check event status
      if (
        [
          EventStatus.rejected,
          EventStatus.timeout,
          EventStatus.paymentWaiting,
        ].includes(eventEntity.status)
      ) {
        logger.info(`Event [${eventId}] is queued for payment again`);
        await dbAction.setEventStatusToPending(
          eventId,
          EventStatus.pendingPayment,
        );
        return true;
      } else if (eventEntity.status === EventStatus.rewardWaiting) {
        logger.info(
          `Event [${eventId}] is queued for reward distribution again`,
        );
        await dbAction.setEventStatusToPending(
          eventId,
          EventStatus.pendingReward,
        );
        return true;
      } else {
        logger.warn(
          (messageOnDenial ? messageOnDenial : `No status is changed as `) +
            `event reprocess is not allowed for status [${eventEntity.status}]`,
        );
        return false;
      }
    } else {
      const result = await dbAction.deleteRejectedEventByTriggerId(
        eventData.txId,
      );
      if (result) {
        logger.info(`Event [${eventId}] is queued for payment again`);
        return true;
      } else {
        logger.info(`Event [${eventId}] is not yet verified nor confirmed`);
        return false;
      }
    }
  };
}

export default EventReprocess;
