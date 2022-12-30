import {
  EventStatus,
  EventTrigger,
  PaymentTransaction,
} from '../../models/Models';
import BaseChain from '../../chains/BaseChains';
import CardanoChain from '../../chains/cardano/CardanoChain';
import ErgoChain from '../../chains/ergo/ErgoChain';
import ChainsConstants from '../../chains/ChainsConstants';
import { dbAction } from '../../db/DatabaseAction';
import EventVerifier from './EventVerifier';
import { txAgreement } from '../agreement/TxAgreement';
import Reward from '../../chains/ergo/Reward';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import MinimumFee from '../MinimumFee';
import {
  ChainNotImplemented,
  NotEnoughAssetsError,
} from '../../helpers/errors';
import Configs from '../../helpers/Configs';
import DiscordNotification from '../../communication/notification/DiscordNotification';

const logger = loggerFactory(import.meta.url);

class EventProcessor {
  static cardanoChain = new CardanoChain();
  static ergoChain = new ErgoChain();

  /**
   * returns chain object
   * @param chain the chain name
   */
  static getChainObject = (chain: string): BaseChain<any, any> => {
    if (chain === ChainsConstants.cardano) return this.cardanoChain;
    else if (chain === ChainsConstants.ergo) return this.ergoChain;
    else throw new ChainNotImplemented(chain);
  };

  /**
   * process captured events by scanner, insert new confirmed ones to ConfirmedEvents table
   */
  static processScannedEvents = async (): Promise<void> => {
    logger.info('Processing scanned events');
    const rawEvents = await dbAction.getUnspentEvents();
    for (const event of rawEvents) {
      try {
        const eventId = Utils.txIdToEventId(event.sourceTxId);
        const eventBoxCreationHeight = ErgoBox.sigma_parse_bytes(
          Utils.base64StringToUint8Array(event.boxSerialized)
        ).creation_height();
        const confirmedEvent = await dbAction.getEventById(eventId);
        if (
          confirmedEvent === null &&
          (await EventVerifier.isEventConfirmedEnough(
            EventTrigger.fromEntity(event),
            eventBoxCreationHeight
          ))
        ) {
          logger.info(
            `Event [${eventId}] with txId [${event.sourceTxId}] confirmed`
          );
          await dbAction.insertConfirmedEvent(event);
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing event txId [${event.sourceTxId}]: ${e.stack}`
        );
      }
    }
    logger.info(`Processed [${rawEvents.length}] scanned events`);
  };

  /**
   * processes pending event triggers in the database
   */
  static processConfirmedEvents = async (): Promise<void> => {
    logger.info('Processing confirmed events');
    const confirmedEvents = await dbAction.getPendingEvents();
    for (const event of confirmedEvents) {
      try {
        if (event.status === EventStatus.pendingPayment)
          await this.processPaymentEvent(
            EventTrigger.fromConfirmedEntity(event)
          );
        else if (event.status === EventStatus.pendingReward)
          await this.processRewardEvent(
            EventTrigger.fromConfirmedEntity(event)
          );
        else
          logger.warn(
            `Impossible case, received event [${event.id}] with status [${event.status}]`
          );
      } catch (e) {
        logger.warn(
          `An error occurred while processing event [${event.id}]: ${e.stack}`
        );
      }
    }
    logger.info(`[${confirmedEvents.length}] Confirmed Events processed`);
  };

  /**
   * searches event triggers in the database with more than leftover confirmation and timeout them
   */
  static TimeoutLeftoverEvents = async (): Promise<void> => {
    logger.info('Searching for leftover events');
    const pendingEvents = await dbAction.getPendingEvents();
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
          `An error occurred while processing leftover event [${event.id}]: ${e.stack}`
        );
      }
    }
    logger.info(
      `[${pendingEvents.length}] Pending Events processed, timeout [${timeoutEventsCount}] of them`
    );
  };

  /**
   * updates all waiting events status to pending
   */
  static RequeueWaitingEvents = async (): Promise<void> => {
    logger.info('Processing waiting events ');
    const waitingEvents = await dbAction.getWaitingEvents();
    for (const event of waitingEvents) {
      try {
        if (event.status === EventStatus.paymentWaiting)
          await dbAction.setEventStatusToPending(
            event.id,
            EventStatus.pendingPayment
          );
        else if (event.status === EventStatus.rewardWaiting)
          await dbAction.setEventStatusToPending(
            event.id,
            EventStatus.pendingReward
          );
        else
          logger.warn(
            `Impossible case, received event [${event.id}] with status [${event.status}]`
          );
      } catch (e) {
        logger.warn(
          `An error occurred while processing waiting event [${event.id}]: ${e.stack}`
        );
      }
    }
    logger.info(`[${waitingEvents.length}] Waiting Events processed`);
  };

  /**
   * processes the event trigger to create payment transaction
   *  1. verify event data with lock tx in source chain
   *  2. create transaction
   *  3. start agreement process on transaction
   * @param event the event trigger
   */
  static processPaymentEvent = async (event: EventTrigger): Promise<void> => {
    logger.info('Processing event for payment', { eventId: event.getId() });
    if (!(await EventVerifier.verifyEvent(event))) {
      logger.info(`Event didn't verify.`);
      await dbAction.setEventStatus(event.getId(), EventStatus.rejected);
      return;
    }

    try {
      const tx = await this.createEventPayment(event);
      if (tx != undefined) txAgreement.startAgreementProcess(tx);
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(
          `Failed to create payment for event [${event.getId()}]: ${e.stack}`
        );
        await DiscordNotification.sendMessage(
          `Failed to create payment for event [${event.getId()}] due to low assets: ${e}`
        );
        await dbAction.setEventStatus(
          event.getId(),
          EventStatus.paymentWaiting
        );
      } else throw e;
    }
  };

  /**
   * processes the event trigger to create reward distribution transaction
   * @param event the event trigger
   */
  static processRewardEvent = async (event: EventTrigger): Promise<void> => {
    logger.info(`Processing event for reward distribution`, {
      eventId: event.getId(),
    });
    if (event.toChain === ChainsConstants.ergo) {
      throw new Error(
        'Events with Ergo as target chain will distribute rewards in a single transaction with payment'
      );
    }
    const feeConfig = await MinimumFee.getEventFeeConfig(event);

    try {
      const tx = await Reward.generateTransaction(event, feeConfig);
      txAgreement.startAgreementProcess(tx);
    } catch (e) {
      if (e instanceof NotEnoughAssetsError) {
        logger.warn(
          `Failed to create reward distribution for event [${event.getId()}]: ${e.stack}`
        );
        await DiscordNotification.sendMessage(
          `Failed to create reward distribution for event [${event.getId()}] due to low assets: ${e}`
        );
        await dbAction.setEventStatus(event.getId(), EventStatus.rewardWaiting);
      } else throw e;
    }
  };

  /**
   * creates an unsigned transaction for payment on target chain
   * @param event the event trigger
   * @return created unsigned transaction
   */
  static createEventPayment = async (
    event: EventTrigger
  ): Promise<PaymentTransaction> => {
    const feeConfig = await MinimumFee.getEventFeeConfig(event);
    return this.getChainObject(event.toChain).generateTransaction(
      event,
      feeConfig
    );
  };
}

export default EventProcessor;
