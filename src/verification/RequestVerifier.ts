import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import EventSerializer from '../event/EventSerializer';
import EventVerifier from './EventVerifier';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../utils/constants';
import TransactionVerifier from './TransactionVerifier';
import { DatabaseAction } from '../db/DatabaseAction';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class RequestVerifier {
  /**
   * verifies the transaction request sent by other guards
   * conditions:
   * - transaction network is compatible with the event
   * - event is confirmed enough
   * - event is verified
   * - event has no active transaction for requested tx type
   * - event status is compatible with requested tx type
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
    const event = EventSerializer.fromConfirmedEntity(eventEntity);

    // transaction network is compatible with the event
    if (tx.txType === TransactionType.payment) {
      if (tx.network !== event.toChain) {
        logger.warn(
          baseError +
            `but transaction chain is unexpected (expected [${event.toChain}] found [${tx.network}])`
        );
        return false;
      }
    } else if (tx.txType === TransactionType.reward) {
      if (tx.network !== ERGO_CHAIN) {
        logger.warn(
          baseError +
            `but reward transactions are only on Ergo (found [${tx.network}])`
        );
        return false;
      }
    } else {
      logger.warn(
        baseError + `but tx type is unexpected (found [${tx.network}])`
      );
      return false;
    }

    // check if event is confirmed enough
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
   * - requested tx is not malicious
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyColdStorageTransactionRequest = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const baseError = `Received cold storage tx [${tx.txId}] `;

    // verify requested tx
    if (!(await TransactionVerifier.verifyColdStorageTransaction(tx))) {
      logger.warn(baseError + `but tx hasn't verified`);
      return false;
    }

    return true;
  };
  /**
   * verifies the transaction request sent by other guards
   * conditions:
   * - transaction network is compatible with the order
   * - order has no active transaction for requested tx type
   * - order status is compatible with requested tx type
   * - requested tx is compatible with order and not malicious
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyArbitraryTransactionRequest = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const orderId = tx.eventId;
    const baseError = `Received tx [${tx.txId}] for arbitrary order [${orderId}] `;

    // get arbitrary order from database
    const orderEntity = await DatabaseAction.getInstance().getOrderById(
      orderId
    );
    if (orderEntity === null) {
      logger.warn(baseError + `but order is not found`);
      return false;
    }

    // transaction network is compatible with the order
    if (tx.network !== orderEntity.chain) {
      logger.warn(
        baseError +
          `but transaction chain is unexpected (expected [${orderEntity.chain}] found [${tx.network}])`
      );
      return false;
    }

    // check if order has any active tx for requested tx type
    const orderTxs = await DatabaseAction.getInstance().getOrderValidTxs(
      orderId
    );
    if (orderTxs.length !== 0 && orderTxs[0].txId !== tx.txId) {
      logger.warn(baseError + `but order has active tx [${orderTxs[0].txId}]`);
      return false;
    }

    // verify requested tx type with order status
    if (orderTxs.length === 0 && orderEntity.status !== OrderStatus.pending) {
      logger.warn(
        baseError +
          `but order status [${orderEntity.status}] is not compatible with requested tx type [${tx.txType}]`
      );
      return false;
    }

    // verify requested tx
    if (
      !(await TransactionVerifier.verifyArbitraryTransaction(
        tx,
        orderEntity.orderJson
      ))
    ) {
      logger.warn(baseError + `but tx hasn't verified`);
      return false;
    }

    return true;
  };
}

export default RequestVerifier;
