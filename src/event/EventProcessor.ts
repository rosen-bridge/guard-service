import Utils from '../utils/Utils';
import Configs from '../configs/Configs';
import EventVerifier from '../verification/EventVerifier';
import EventSerializer from './EventSerializer';
import EventOrder from './EventOrder';
import EventBoxes from './EventBoxes';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';
import { EventStatus, EventUnexpectedFailsLimit } from '../utils/constants';
import {
  EventTrigger,
  ImpossibleBehavior,
  NotEnoughAssetsError,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import ChainHandler from '../handlers/ChainHandler';
import { ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import { rosenConfig } from '../configs/RosenConfig';
import TxAgreement from '../agreement/TxAgreement';
import * as TransactionSerializer from '../transaction/TransactionSerializer';
import { DatabaseAction } from '../db/DatabaseAction';
import GuardTurn from '../utils/GuardTurn';
import GuardPkHandler from '../handlers/GuardPkHandler';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { NotificationHandler } from '../handlers/NotificationHandler';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class EventProcessor {
  /**
   * processes scanned events and insert new confirmed ones to ConfirmedEvents table
   */
  static processScannedEvents = async (): Promise<void> => {
    logger.info('Processing scanned events');
    const rawEvents = await DatabaseAction.getInstance().getUnconfirmedEvents();
    for (const event of rawEvents) {
      try {
        const eventId = Utils.txIdToEventId(event.sourceTxId);
        const confirmedEvent = await DatabaseAction.getInstance().getEventById(
          eventId
        );
        if (
          confirmedEvent === null &&
          (await EventVerifier.isEventConfirmedEnough(
            EventSerializer.fromEntity(event)
          ))
        ) {
          logger.info(
            `Event [${eventId}] with txId [${event.sourceTxId}] confirmed`
          );
          await DatabaseAction.getInstance().insertConfirmedEvent(event);
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing event txId [${event.sourceTxId}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(`Processed [${rawEvents.length}] scanned events`);
  };

  /**
   * processes pending event triggers in the database
   */
  static processConfirmedEvents = async (): Promise<void> => {
    logger.info('Processing confirmed events');
    const confirmedEvents =
      await DatabaseAction.getInstance().getEventsByStatuses([
        EventStatus.pendingPayment,
        EventStatus.pendingReward,
      ]);
    for (const event of confirmedEvents) {
      if (GuardTurn.guardTurn() !== GuardPkHandler.getInstance().guardId) {
        logger.info(`Turn is over. Abort process of confirmed events`);
        break;
      }
      try {
        // check if event is active
        if (event.eventData.spendHeight) {
          logger.info(
            `Event [${event.id}] is spent at height [${event.eventData.spendHeight}]`
          );
          await DatabaseAction.getInstance().setEventStatus(
            event.id,
            EventStatus.spent
          );
          continue;
        }
        // check how many times event txs unexpectedly failed
        if (event.unexpectedFails >= EventUnexpectedFailsLimit) {
          logger.warn(
            `Event [${event.id}] will no longer be processed due to too much unexpected failures`
          );
          await DatabaseAction.getInstance().setEventStatus(
            event.id,
            EventStatus.reachedLimit
          );
          continue;
        }
        // process event
        if (event.status === EventStatus.pendingPayment)
          await this.processPaymentEvent(
            EventSerializer.fromConfirmedEntity(event)
          );
        else if (event.status === EventStatus.pendingReward)
          await this.processRewardEvent(
            EventSerializer.fromConfirmedEntity(event)
          );
        else
          logger.warn(
            `Impossible case, received event [${event.id}] with status [${event.status}]`
          );
      } catch (e) {
        logger.warn(
          `An error occurred while processing event [${event.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(`Processed [${confirmedEvents.length}] confirmed events`);
  };

  /**
   * processes the event trigger to create payment transaction
   *  1. verify event data with lock tx in source chain
   *  2. create transaction
   *  3. start agreement process on transaction
   * @param event the event trigger
   */
  static processPaymentEvent = async (event: EventTrigger): Promise<void> => {
    const eventId = EventSerializer.getId(event);
    logger.info(`Processing event [${eventId}] for payment`);

    // get minimum-fee and verify event
    const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);

    // verify event
    if (!(await EventVerifier.verifyEvent(event, feeConfig))) {
      logger.warn(`Event [${eventId}] hasn't verified`);
      await DatabaseAction.getInstance().setEventStatus(
        eventId,
        EventStatus.rejected
      );
      return;
    }

    // create payment
    try {
      const tx = await this.createEventPayment(event, feeConfig);
      if (GuardTurn.guardTurn() === GuardPkHandler.getInstance().guardId)
        (await TxAgreement.getInstance()).addTransactionToQueue(tx);
      else
        logger.info(
          `Tx [${tx.txId}] is generated but turn is over. No tx will be added to Agreement queue`
        );
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(`Failed to create payment for event [${eventId}]: ${e}`);
        if (e.stack) logger.warn(e.stack);
        await NotificationHandler.getInstance().notify(
          'error',
          `Low Assets in ${event.toChain}`,
          `Failed to create payment for event [${eventId}] due to low assets: ${e}`
        );
        await DatabaseAction.getInstance().setEventStatus(
          eventId,
          EventStatus.paymentWaiting
        );
      } else throw e;
    }
  };

  /**
   * creates an unsigned transaction for payment on target chain
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @returns created unsigned transaction
   */
  protected static createEventPayment = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee
  ): Promise<PaymentTransaction> => {
    const targetChain = ChainHandler.getInstance().getChain(event.toChain);

    const extra: any[] = [];
    const eventWIDs: string[] = [];

    // add reward order if target chain is ergo
    if (event.toChain === ERGO_CHAIN) {
      const ergoChain = targetChain as ErgoChain;

      // get event and commitment boxes
      const eventBox = await EventBoxes.getEventBox(event);
      const rwtCount = ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDsCount);

      eventWIDs.push(...(await EventBoxes.getEventWIDs(event)));
      const commitmentBoxes = await EventBoxes.getEventValidCommitments(
        event,
        rwtCount,
        eventWIDs
      );
      const guardsConfigBox = await ergoChain.getGuardsConfigBox(
        rosenConfig.guardNFT,
        rosenConfig.guardSignAddress
      );

      // add event and commitment boxes to generateTransaction arguments
      extra.push([eventBox, ...commitmentBoxes], [guardsConfigBox]);
    }

    // add payment order
    const order = await EventOrder.createEventPaymentOrder(
      event,
      feeConfig,
      eventWIDs
    );

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions = (
      await TxAgreement.getInstance()
    ).getChainPendingTransactions(event.toChain);
    const unsignedQueueTransactions = (
      await DatabaseAction.getInstance().getUnsignedActiveTxsInChain(
        event.toChain
      )
    ).map((txEntity) => TransactionSerializer.fromJson(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await DatabaseAction.getInstance().getSignedActiveTxsInChain(
        event.toChain
      )
    ).map((txEntity) =>
      Buffer.from(
        TransactionSerializer.fromJson(txEntity.txJson).txBytes
      ).toString('hex')
    );

    // generate transaction
    return targetChain.generateTransaction(
      EventSerializer.getId(event),
      TransactionType.payment,
      order,
      [...unsignedAgreementTransactions, ...unsignedQueueTransactions],
      signedTransactions,
      ...extra
    );
  };

  /**
   * processes the event trigger to create reward distribution transaction
   * @param event the event trigger
   */
  static processRewardEvent = async (event: EventTrigger): Promise<void> => {
    const eventId = EventSerializer.getId(event);
    logger.info(`Processing event [${eventId}] for reward distribution`);

    if (event.toChain === ERGO_CHAIN)
      throw new ImpossibleBehavior(
        'Events with Ergo as toChain will distribute rewards in a single transaction with payment'
      );

    // get event payment transaction
    const eventTxs = await DatabaseAction.getInstance().getEventValidTxsByType(
      eventId,
      TransactionType.payment
    );
    if (eventTxs.length !== 1)
      throw new ImpossibleBehavior(
        `Processing event [${eventId}] for reward distribution but no payment tx found for it in database`
      );
    const paymentTxId = eventTxs[0].txId;

    // get minimum-fee and verify event
    const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);

    try {
      const tx = await this.createEventRewardDistribution(
        event,
        feeConfig,
        paymentTxId
      );
      if (GuardTurn.guardTurn() === GuardPkHandler.getInstance().guardId)
        (await TxAgreement.getInstance()).addTransactionToQueue(tx);
      else
        logger.info(
          `Tx [${tx.txId}] is generated but turn is over. No tx will be added to Agreement queue`
        );
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(
          `Failed to create reward distribution for event [${eventId}]: ${e}`
        );
        if (e.stack) logger.warn(e.stack);
        await NotificationHandler.getInstance().notify(
          'error',
          `Low Assets in Ergo`,
          `Failed to create reward distribution for event [${eventId}] due to low assets: ${e}`
        );
        await DatabaseAction.getInstance().setEventStatus(
          eventId,
          EventStatus.rewardWaiting
        );
      } else throw e;
    }
  };

  /**
   * creates an unsigned transaction for event reward distribution on ergo chain
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @param paymentTxId the payment transaction of the event
   * @returns created unsigned transaction
   */
  protected static createEventRewardDistribution = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee,
    paymentTxId: string
  ): Promise<PaymentTransaction> => {
    const ergoChain = ChainHandler.getInstance().getErgoChain();

    // get event and commitment boxes
    const eventBox = await EventBoxes.getEventBox(event);
    const rwtCount = ergoChain.getBoxRWT(eventBox) / BigInt(event.WIDsCount);

    const eventWIDs = await EventBoxes.getEventWIDs(event);
    const commitmentBoxes = await EventBoxes.getEventValidCommitments(
      event,
      rwtCount,
      eventWIDs
    );
    const guardsConfigBox = await ergoChain.getGuardsConfigBox(
      rosenConfig.guardNFT,
      rosenConfig.guardSignAddress
    );

    // generate reward order
    const order = await EventOrder.createEventRewardOrder(
      event,
      feeConfig,
      paymentTxId,
      eventWIDs
    );

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions = (
      await TxAgreement.getInstance()
    ).getChainPendingTransactions(ERGO_CHAIN);
    const unsignedQueueTransactions = (
      await DatabaseAction.getInstance().getUnsignedActiveTxsInChain(ERGO_CHAIN)
    ).map((txEntity) => TransactionSerializer.fromJson(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await DatabaseAction.getInstance().getSignedActiveTxsInChain(ERGO_CHAIN)
    ).map((txEntity) =>
      Buffer.from(
        TransactionSerializer.fromJson(txEntity.txJson).txBytes
      ).toString('hex')
    );

    // generate transaction
    return ergoChain.generateTransaction(
      EventSerializer.getId(event),
      TransactionType.reward,
      order,
      [...unsignedAgreementTransactions, ...unsignedQueueTransactions],
      signedTransactions,
      [eventBox, ...commitmentBoxes],
      [guardsConfigBox]
    );
  };

  /**
   * searches event triggers in the database with more than leftover confirmation and timeout them
   */
  static TimeoutLeftoverEvents = async (): Promise<void> => {
    logger.info('Searching for leftover events');
    const pendingEvents =
      await DatabaseAction.getInstance().getEventsByStatuses([
        EventStatus.pendingPayment,
      ]);

    let timeoutEventsCount = 0;
    for (const event of pendingEvents) {
      try {
        if (
          Math.round(Date.now() / 1000) >
          Number(event.firstTry) + Configs.eventTimeout
        ) {
          await DatabaseAction.getInstance().setEventStatus(
            event.id,
            EventStatus.timeout
          );
          timeoutEventsCount += 1;
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing leftover event [${event.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(
      `Processed [${pendingEvents.length}] pending events, timeout [${timeoutEventsCount}] of them`
    );
  };

  /**
   * updates all waiting events status to pending
   */
  static RequeueWaitingEvents = async (): Promise<void> => {
    logger.info('Processing waiting events');
    const waitingEvents = await DatabaseAction.getInstance().getWaitingEvents();

    let requeueEventsCount = 0;
    for (const event of waitingEvents) {
      try {
        if (event.status === EventStatus.paymentWaiting) {
          await DatabaseAction.getInstance().setEventStatusToPending(
            event.id,
            EventStatus.pendingPayment
          );
          requeueEventsCount += 1;
        } else if (event.status === EventStatus.rewardWaiting) {
          await DatabaseAction.getInstance().setEventStatusToPending(
            event.id,
            EventStatus.pendingReward
          );
          requeueEventsCount += 1;
        } else
          logger.warn(
            `Impossible case, received event [${event.id}] with status [${event.status}]`
          );
      } catch (e) {
        logger.warn(
          `An error occurred while processing waiting event [${event.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(
      `Processed [${waitingEvents.length}] waiting events, requeue [${requeueEventsCount}] of them`
    );
  };
}

export default EventProcessor;
