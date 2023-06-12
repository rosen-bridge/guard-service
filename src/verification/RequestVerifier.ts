import { PaymentTransaction } from '@rosen-chains/abstract-chain';
import { dbAction } from '../db/DatabaseAction';
import EventSerializer from '../event/EventSerializer';
import EventVerifier from './EventVerifier';
import MinimumFee from '../event/MinimumFee';
import { EventStatus, TransactionStatus } from '../models/Models';
import { loggerFactory } from '../log/Logger';
import TransactionVerifier from './TransactionVerifier';

const logger = loggerFactory(import.meta.url);

class RequestVerifier {
  /**
   * verifies the transaction request sent by other guards
   * conditions:
   * - event is confirmed enough
   * - event is verified
   * - event status is compatible with requested tx type
   * - event has no active transaction for requested tx type
   * - requested tx is compatible with event and not malicious
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyEventTransactionRequest = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const eventId = tx.eventId;
    const baseError = `Received tx [${tx.txId}] for event [${eventId}] `;

    // get event from database
    const eventEntity = await dbAction.getEventById(eventId);
    if (eventEntity === null) {
      logger.warn(baseError + `but event not found`);
      return false;
    }

    // check if event is confirmed enough
    const event = EventSerializer.fromConfirmedEntity(eventEntity);
    if (!(await EventVerifier.isEventConfirmedEnough(event))) {
      logger.warn(baseError + `event is not confirmed enough`);
      return false;
    }

    // get minimum-fee and verify event
    const feeConfig = await MinimumFee.getEventFeeConfig(event);

    // verify event
    if (!(await EventVerifier.verifyEvent(event, feeConfig))) {
      logger.warn(baseError + `but event hasn't verified`);
      await dbAction.setEventStatus(eventId, EventStatus.rejected);
      return false;
    }

    // verify requested tx type
    if (!EventVerifier.isEventPendingToType(eventEntity, tx.txType)) {
      logger.warn(
        baseError +
          `but event status [${eventEntity.status}] is not compatible with requested tx type [${tx.txType}]`
      );
      return false;
    }

    // check if event has any active tx for requested tx type
    const eventTxs = await dbAction.getEventValidTxsByType(eventId, tx.txType);
    if (eventTxs.length !== 0 && eventTxs[0].txId !== tx.txId) {
      logger.warn(baseError + `but event has active tx [${eventTxs[0].txId}]`);
      return false;
    }

    // verify requested tx
    if (!(await TransactionVerifier.verifyEventTransaction(tx, event))) {
      logger.warn(baseError + `but tx hasn't verified`);
      return false;
    }

    return true;
  };

  /**
   * verifies the cold storage transaction request sent by other guards
   * conditions:
   * - there is no active cold storage transaction
   * - requested tx is not malicious
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyColdStorageTransactionRequest = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const baseError = `Received cold storage tx [${tx.txId}] `;

    // check if event has any active tx for requested tx type
    const inProgressColdStorageTxs = (
      await dbAction.getNonCompleteColdStorageTxsInChain(tx.network)
    ).filter((tx) => tx.status != TransactionStatus.invalid);
    if (
      inProgressColdStorageTxs.length !== 0 &&
      inProgressColdStorageTxs[0].txId !== tx.txId
    ) {
      logger.warn(
        baseError +
          `but found active cold storage tx [${inProgressColdStorageTxs[0].txId}]`
      );
      return false;
    }

    // verify requested tx
    if (!(await TransactionVerifier.verifyColdStorageTransaction(tx))) {
      logger.warn(baseError + `but tx hasn't verified`);
      return false;
    }

    return true;
  };
}

export default RequestVerifier;
