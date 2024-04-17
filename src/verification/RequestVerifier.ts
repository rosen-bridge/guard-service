import { PaymentTransaction } from '@rosen-chains/abstract-chain';
import EventSerializer from '../event/EventSerializer';
import EventVerifier from './EventVerifier';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';
import { EventStatus, TransactionStatus } from '../utils/constants';
import TransactionVerifier from './TransactionVerifier';
import { DatabaseAction } from '../db/DatabaseAction';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

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
    const eventEntity = await DatabaseAction.getInstance().getEventById(
      eventId
    );
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
    const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);

    // verify event
    if (!(await EventVerifier.verifyEvent(event, feeConfig))) {
      logger.warn(baseError + `but event hasn't verified`);
      await DatabaseAction.getInstance().setEventStatus(
        eventId,
        EventStatus.rejected
      );
      return false;
    }

    // check if event has any active tx for requested tx type
    const eventTxs = await DatabaseAction.getInstance().getEventValidTxsByType(
      eventId,
      tx.txType
    );
    if (eventTxs.length !== 0 && eventTxs[0].txId !== tx.txId) {
      logger.warn(baseError + `but event has active tx [${eventTxs[0].txId}]`);
      return false;
    }

    // verify requested tx type with event status
    if (
      eventTxs.length === 0 &&
      !EventVerifier.isEventPendingToType(eventEntity, tx.txType)
    ) {
      logger.warn(
        baseError +
          `but event status [${eventEntity.status}] is not compatible with requested tx type [${tx.txType}]`
      );
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
      await DatabaseAction.getInstance().getNonCompleteColdStorageTxsInChain(
        tx.network
      )
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
