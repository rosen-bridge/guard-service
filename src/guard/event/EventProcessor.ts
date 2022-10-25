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
import { logger } from '../../log/Logger';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import Configs from '../../helpers/Configs';
import MinimumFee from '../MinimumFee';

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
    else throw new Error(`Chain [${chain}] not implemented.`);
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
    if (!(await EventVerifier.verifyEvent(event))) {
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
    const tokenId = Configs.tokenMap.getID(
      Configs.tokenMap.search(event.fromChain, {
        [Configs.tokenMap.getIdKey(event.fromChain)]: event.sourceChainTokenId,
      })[0],
      ChainsConstants.ergo
    );
    const feeConfig = await MinimumFee.bridgeMinimumFee.getFee(
      tokenId,
      ChainsConstants.ergo,
      event.height
    );
    const tx = await Reward.generateTransaction(event, feeConfig);
    txAgreement.startAgreementProcess(tx);
  };

  /**
   * creates an unsigned transaction for payment on target chain
   * @param event the event trigger
   * @return created unsigned transaction
   */
  static createEventPayment = async (
    event: EventTrigger
  ): Promise<PaymentTransaction> => {
    const tokenId = Configs.tokenMap.getID(
      Configs.tokenMap.search(event.fromChain, {
        [Configs.tokenMap.getIdKey(event.fromChain)]: event.sourceChainTokenId,
      })[0],
      ChainsConstants.ergo
    );
    const feeConfig = await MinimumFee.bridgeMinimumFee.getFee(
      tokenId,
      event.toChain,
      event.height
    );
    return this.getChainObject(event.toChain).generateTransaction(
      event,
      feeConfig
    );
  };
}

export default EventProcessor;
