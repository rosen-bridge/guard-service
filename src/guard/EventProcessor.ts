import {
  EventStatus,
  EventTrigger,
  PaymentTransaction,
  TransactionTypes,
} from '../models/Models';
import BaseChain from '../chains/BaseChains';
import CardanoChain from '../chains/cardano/CardanoChain';
import ErgoChain from '../chains/ergo/ErgoChain';
import ChainsConstants from '../chains/ChainsConstants';
import KoiosApi from '../chains/cardano/network/KoiosApi';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
import ExplorerApi from '../chains/ergo/network/ExplorerApi';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { dbAction } from '../db/DatabaseAction';
import { txAgreement } from './agreement/TxAgreement';
import Reward from '../chains/ergo/Reward';
import Utils from '../helpers/Utils';
import ErgoTransaction from '../chains/ergo/models/ErgoTransaction';
import InputBoxes from '../chains/ergo/boxes/InputBoxes';
import { logger } from '../log/Logger';
import NodeApi from '../chains/ergo/network/NodeApi';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';

class EventProcessor {
  static cardanoChain = new CardanoChain();
  static ergoChain = new ErgoChain();

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
          (await this.isEventConfirmedEnough(
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
          `An error occurred while processing event txId [${event.sourceTxId}]: ${e}`
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
          `An error occurred while processing event [${event.id}]: ${e}`
        );
      }
    }
    logger.info(`[${confirmedEvents.length}] Confirmed Events processed`);
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
    if (!(await this.verifyEvent(event))) {
      logger.info(`Event didn't verify.`);
      await dbAction.setEventStatus(event.getId(), 'rejected');
      return;
    }

    const tx = await this.createEventPayment(event);
    txAgreement.startAgreementProcess(tx);
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
    const tx = await Reward.generateTransaction(event);
    txAgreement.startAgreementProcess(tx);
  };

  /**
   * returns chain object
   * @param chain the chain name
   */
  static getChainObject = (chain: string): BaseChain<any, any> => {
    if (chain === ChainsConstants.cardano) return this.cardanoChain;
    else if (chain === ChainsConstants.ergo) return this.ergoChain;
    else throw new Error(`Chain [${chain}] not implemented.`);
  };

  /**
   * conforms transaction with the event trigger data
   * @param paymentTx the payment transaction
   * @param event the event trigger
   * @return true if payment transaction verified
   */
  static verifyPaymentTransactionWithEvent = async (
    paymentTx: PaymentTransaction,
    event: EventTrigger
  ): Promise<boolean> => {
    if (paymentTx.txType === TransactionTypes.payment)
      return await this.getChainObject(
        paymentTx.network
      ).verifyTransactionWithEvent(paymentTx, event);
    else
      return await Reward.verifyTransactionWithEvent(
        paymentTx as ErgoTransaction,
        event
      );
  };

  /**
   * conforms event data with lock transaction in source chain
   * @param event the trigger event
   * @return true if event data verified
   */
  static verifyEvent = async (event: EventTrigger): Promise<boolean> => {
    const eventBox = await InputBoxes.getEventBox(event);
    const RWTId = eventBox.tokens().get(0).id().to_str();
    if (event.fromChain === ChainsConstants.cardano)
      return this.cardanoChain.verifyEventWithPayment(event, RWTId);
    else if (event.fromChain === ChainsConstants.ergo)
      return this.ergoChain.verifyEventWithPayment(event, RWTId);
    else throw new Error(`Chain [${event.fromChain}] not implemented.`);
  };

  /**
   * creates an unsigned transaction for payment on target chain
   * @param event the event trigger
   * @return created unsigned transaction
   */
  static createEventPayment = (
    event: EventTrigger
  ): Promise<PaymentTransaction> => {
    return this.getChainObject(event.toChain).generateTransaction(event);
  };

  /**
   * checks if event source tx confirmed enough
   * @param event the event trigger
   * @param eventBoxCreationHeight the creation height of the event box
   */
  static isEventConfirmedEnough = async (
    event: EventTrigger,
    eventBoxCreationHeight: number
  ): Promise<boolean> => {
    // check if the event box in ergo chain confirmed enough
    const ergoCurrentHeight = await NodeApi.getHeight();
    if (
      ergoCurrentHeight - eventBoxCreationHeight <
      ErgoConfigs.requiredConfirmation
    )
      return false;

    // check if lock transaction in source chain confirmed enough
    if (event.fromChain === ChainsConstants.cardano) {
      const confirmation = await KoiosApi.getTxConfirmation(event.sourceTxId);
      return (
        confirmation !== null &&
        confirmation >= CardanoConfigs.requiredConfirmation
      );
    } else if (event.fromChain === ChainsConstants.ergo) {
      const confirmation = await ExplorerApi.getTxConfirmation(
        event.sourceTxId
      );
      return confirmation >= ErgoConfigs.requiredConfirmation;
    } else throw new Error(`Chain [${event.fromChain}] not implemented.`);
  };
}

export default EventProcessor;
