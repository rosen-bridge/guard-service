import { loggerFactory } from '../log/Logger';
import { dbAction } from '../db/DatabaseAction';
import Utils from '../helpers/Utils';
import Configs from '../helpers/Configs';
import EventVerifier from '../verification/EventVerifier';
import EventSerializer from './EventSerializer';
import EventOrder from './EventOrder';
import EventBoxes from './EventBoxes';
import MinimumFee from './MinimumFee';
import { EventStatus } from '../models/Models';
import {
  EventTrigger,
  ImpossibleBehavior,
  NotEnoughAssetsError,
  PaymentOrder,
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { txAgreement } from '../guard/agreement/TxAgreement';
import DiscordNotification from '../communication/notification/DiscordNotification';
import { Fee } from '@rosen-bridge/minimum-fee';
import ChainHandler from '../handlers/ChainHandler';
import { ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import {
  paymentTransactionTypeChange,
  txJsonParser,
} from '../chains/TxJsonParser';
import { rosenConfig } from '../helpers/RosenConfig';

const logger = loggerFactory(import.meta.url);

class EventProcessor {
  /**
   * processes scanned events and insert new confirmed ones to ConfirmedEvents table
   */
  static processScannedEvents = async (): Promise<void> => {
    logger.info('Processing scanned events');
    const rawEvents = await dbAction.getUnconfirmedEvents();
    for (const event of rawEvents) {
      try {
        const eventId = Utils.txIdToEventId(event.sourceTxId);
        // TODO: after updating `getUnconfirmedEvents` query, there is no need for next line (#204)
        const confirmedEvent = await dbAction.getEventById(eventId);
        if (
          confirmedEvent === null &&
          (await EventVerifier.isEventConfirmedEnough(
            EventSerializer.fromEntity(event)
          ))
        ) {
          logger.info(
            `Event [${eventId}] with txId [${event.sourceTxId}] confirmed`
          );
          await dbAction.insertConfirmedEvent(event);
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
    const confirmedEvents = await dbAction.getEventsByStatuses([
      EventStatus.pendingPayment,
      EventStatus.pendingReward,
    ]);
    for (const event of confirmedEvents) {
      try {
        // check if event is active
        if (event.eventData.spendHeight) {
          logger.info(
            `Event [${event.id}] is spent at height [${event.eventData.spendHeight}]`
          );
          await dbAction.setEventStatus(event.id, EventStatus.spent);
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
    const feeConfig = await MinimumFee.getEventFeeConfig(event);

    // verify event
    if (!(await EventVerifier.verifyEvent(event, feeConfig))) {
      logger.info(`Event hasn't verified`);
      await dbAction.setEventStatus(eventId, EventStatus.rejected);
      return;
    }

    // create payment
    try {
      const tx = await this.createEventPayment(event, feeConfig);
      txAgreement.startAgreementProcess(paymentTransactionTypeChange(tx));
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(`Failed to create payment for event [${eventId}]: ${e}`);
        logger.warn(e.stack);
        await DiscordNotification.sendMessage(
          `Failed to create payment for event [${eventId}] due to low assets: ${e}`
        );
        await dbAction.setEventStatus(eventId, EventStatus.paymentWaiting);
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
    feeConfig: Fee
  ): Promise<PaymentTransaction> => {
    const targetChain = ChainHandler.getChain(event.toChain);
    const chainMinTransfer = targetChain.getMinimumNativeToken();

    const order: PaymentOrder = [];
    const extra: any[] = [];

    // add reward order if target chain is ergo
    if (event.toChain === ERGO_CHAIN) {
      const ergoChain = targetChain as ErgoChain;

      // get event and commitment boxes
      const eventBox = await EventBoxes.getEventBox(event);
      const rwtCount =
        ergoChain.getBoxInfo(eventBox).assets.tokens[0].value /
        BigInt(event.WIDs.length);

      const commitmentBoxes = await EventBoxes.getEventValidCommitments(
        event,
        rwtCount
      );
      const guardsConfigBox = await ergoChain.getGuardsConfigBox(
        rosenConfig.guardNFT,
        rosenConfig.guardSignAddress
      );

      // generate reward order
      const rewardOrder = EventOrder.eventRewardOrder(
        event,
        commitmentBoxes.map(ergoChain.getBoxWID),
        feeConfig,
        '',
        ChainHandler.getChain(event.fromChain).getRWTToken(),
        rwtCount
      );
      order.push(...rewardOrder);

      // add event and commitment boxes to generateTransaction arguments
      extra.push([eventBox, ...commitmentBoxes], [guardsConfigBox]);
    }

    // add payment order
    const paymentRecord = EventOrder.eventSinglePayment(
      event,
      chainMinTransfer,
      feeConfig
    );
    order.push(paymentRecord);

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions =
      txAgreement.getChainPendingTransactions(event.toChain);
    const unsignedQueueTransactions = (
      await dbAction.getUnsignedActiveTxsInChain(event.toChain)
    ).map((txEntity) => txJsonParser(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await dbAction.getSignedActiveTxsInChain(event.toChain)
    ).map((txEntity) =>
      Buffer.from(txJsonParser(txEntity.txJson).txBytes).toString('hex')
    );

    // generate transaction
    return targetChain.generateTransaction(
      EventSerializer.getId(event),
      TransactionTypes.payment,
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

    // get minimum-fee and verify event
    const feeConfig = await MinimumFee.getEventFeeConfig(event);

    try {
      const tx = await this.createEventRewardDistribution(event, feeConfig);
      txAgreement.startAgreementProcess(paymentTransactionTypeChange(tx));
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(
          `Failed to create reward distribution for event [${eventId}]: ${e}`
        );
        logger.warn(e.stack);
        await DiscordNotification.sendMessage(
          `Failed to create reward distribution for event [${eventId}] due to low assets: ${e}`
        );
        await dbAction.setEventStatus(eventId, EventStatus.rewardWaiting);
      } else throw e;
    }
  };

  /**
   * creates an unsigned transaction for event reward distribution on ergo chain
   * @param event the event trigger
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @returns created unsigned transaction
   */
  protected static createEventRewardDistribution = async (
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<PaymentTransaction> => {
    const ergoChain = ChainHandler.getErgoChain();

    // get event and commitment boxes
    const eventBox = await EventBoxes.getEventBox(event);
    const rwtCount =
      ergoChain.getBoxInfo(eventBox).assets.tokens[0].value /
      BigInt(event.WIDs.length);

    const commitmentBoxes = await EventBoxes.getEventValidCommitments(
      event,
      rwtCount
    );
    const guardsConfigBox = await ergoChain.getGuardsConfigBox(
      rosenConfig.guardNFT,
      rosenConfig.guardSignAddress
    );

    // generate reward order
    const order = EventOrder.eventRewardOrder(
      event,
      commitmentBoxes.map(ergoChain.getBoxWID),
      feeConfig,
      '',
      ChainHandler.getChain(event.fromChain).getRWTToken(),
      rwtCount
    );

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions =
      txAgreement.getChainPendingTransactions(ERGO_CHAIN);
    const unsignedQueueTransactions = (
      await dbAction.getUnsignedActiveTxsInChain(ERGO_CHAIN)
    ).map((txEntity) => txJsonParser(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await dbAction.getSignedActiveTxsInChain(ERGO_CHAIN)
    ).map((txEntity) =>
      Buffer.from(txJsonParser(txEntity.txJson).txBytes).toString('hex')
    );

    // generate transaction
    return ergoChain.generateTransaction(
      EventSerializer.getId(event),
      TransactionTypes.payment,
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
    const pendingEvents = await dbAction.getEventsByStatuses([
      EventStatus.pendingPayment,
    ]);

    let timeoutEventsCount = 0;
    for (const event of pendingEvents) {
      try {
        if (
          Math.round(Date.now() / 1000) >
          Number(event.firstTry) + Configs.eventTimeout
        ) {
          await dbAction.setEventStatus(event.id, EventStatus.timeout);
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
    const waitingEvents = await dbAction.getWaitingEvents();

    let requeueEventsCount = 0;
    for (const event of waitingEvents) {
      try {
        if (event.status === EventStatus.paymentWaiting) {
          await dbAction.setEventStatusToPending(
            event.id,
            EventStatus.pendingPayment
          );
          requeueEventsCount += 1;
        } else if (event.status === EventStatus.rewardWaiting) {
          await dbAction.setEventStatusToPending(
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
