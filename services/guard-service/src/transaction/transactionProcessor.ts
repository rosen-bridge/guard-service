import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractChain,
  ConfirmationStatus,
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { SigningStatus } from '@rosen-chains/abstract-chain';
import { DOGE_CHAIN } from '@rosen-chains/doge';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

import GuardsDogeConfigs from '../configs/guardsDogeConfigs';
import { DatabaseAction } from '../db/databaseAction';
import { TransactionEntity } from '../db/entities/transactionEntity';
import ChainHandler from '../handlers/chainHandler';
import { NotificationHandler } from '../handlers/notificationHandler';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../utils/constants';
import * as TransactionSerializer from './transactionSerializer';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * the event/order move that follows the completion of a transaction
 * `expectedEventStatus`/`expectedOrderStatus` is the status the
 * event/order is in while the transaction is being processed; it is
 * only used when re-driving a stuck completed transaction, to make
 * sure the event/order was not already moved on by its own next step
 */
interface CompletedTxTransition {
  eventId?: string;
  eventStatus?: string;
  setEventFirstTry?: boolean;
  expectedEventStatus?: string;
  orderId?: string;
  orderStatus?: string;
  expectedOrderStatus?: string;
}

class TransactionProcessor {
  /**
   * processes all active transactions in the database
   */
  static processTransactions = async (): Promise<void> => {
    logger.info(`Processing transactions`);
    const txs = await DatabaseAction.getInstance().getActiveTransactions();
    for (const tx of txs) {
      logger.info(
        `Processing transaction [${tx.txId}] with status [${tx.status}]`,
      );
      try {
        switch (tx.status) {
          case TransactionStatus.approved: {
            await this.processApprovedTx(tx);
            break;
          }
          case TransactionStatus.inSign: {
            await this.processInSignTx(tx);
            break;
          }
          case TransactionStatus.signFailed: {
            await this.processSignFailedTx(tx);
            break;
          }
          case TransactionStatus.signed: {
            await this.processSignedTx(tx);
            break;
          }
          case TransactionStatus.sent: {
            await this.processSentTx(tx);
            break;
          }
        }
      } catch (e) {
        logger.warn(`An error occurred while processing tx [${tx.txId}]: ${e}`);
        logger.warn(e.stack);
      }
    }
    logger.info(`Processed [${txs.length}] transactions`);
    await this.processStuckCompletedTransactions();
  };

  /**
   * returns the event/order move that follows the completion of a tx
   * @param tx transaction record
   * @returns the transition, or undefined when the tx type has no
   * event/order to move (e.g. cold storage and manual transactions)
   */
  static getCompletedTxTransition = (
    tx: TransactionEntity,
  ): CompletedTxTransition | undefined => {
    if (tx.type === TransactionType.payment && tx.chain !== ERGO_CHAIN) {
      if (!tx.event)
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] has no event associated with it`,
        );
      // set event status, to start reward distribution
      return {
        eventId: tx.event.id,
        eventStatus: EventStatus.pendingReward,
        setEventFirstTry: true,
        expectedEventStatus: EventStatus.inPayment,
      };
    } else if (
      tx.type === TransactionType.reward ||
      (tx.type === TransactionType.payment && tx.chain === ERGO_CHAIN)
    ) {
      if (!tx.event)
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] has no event associated with it`,
        );
      // set event as complete
      return {
        eventId: tx.event.id,
        eventStatus: EventStatus.completed,
        expectedEventStatus:
          tx.type === TransactionType.reward
            ? EventStatus.inReward
            : EventStatus.inPayment,
      };
    } else if (tx.type === TransactionType.arbitrary) {
      if (!tx.order)
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] has no order associated with it`,
        );
      // set order as complete
      return {
        orderId: tx.order.id,
        orderStatus: OrderStatus.completed,
        expectedOrderStatus: OrderStatus.inProcess,
      };
    }
    return undefined;
  };

  /**
   * finishes the event/order move of transactions that are already
   * completed but whose event/order never moved on
   *
   * before the completion writes were made atomic, a guard that stopped
   * between setting a tx as completed and moving its event/order left
   * the event in `in-payment`/`in-reward` (or the order in `in-process`)
   * forever, since completed transactions are not processed again and
   * nothing else moves those events/orders
   */
  static processStuckCompletedTransactions = async (): Promise<void> => {
    const txs =
      await DatabaseAction.getInstance().getCompletedTxsWithUnfinishedEventOrOrder();
    for (const tx of txs) {
      try {
        const transition = this.getCompletedTxTransition(tx);
        if (transition === undefined) continue;
        const eventId = transition.eventId;
        const eventStatus = transition.eventStatus;
        if (eventId !== undefined && eventStatus !== undefined) {
          // move the event only if it is still in the status this tx was
          // supposed to move it from; an event that already moved on
          // (e.g. a payment event already distributing its reward) must
          // not be sent back
          if (!tx.event || tx.event.status !== transition.expectedEventStatus)
            continue;
          if (transition.setEventFirstTry)
            await DatabaseAction.getInstance().setEventStatusToPending(
              eventId,
              eventStatus,
            );
          else
            await DatabaseAction.getInstance().setEventStatus(
              eventId,
              eventStatus,
            );
          logger.info(
            `Tx [${tx.txId}] was already completed but event [${eventId}] was left in [${transition.expectedEventStatus}]. Event is now [${eventStatus}]`,
          );
        }
        const orderId = transition.orderId;
        const orderStatus = transition.orderStatus;
        if (orderId !== undefined && orderStatus !== undefined) {
          if (!tx.order || tx.order.status !== transition.expectedOrderStatus)
            continue;
          await DatabaseAction.getInstance().setOrderStatus(
            orderId,
            orderStatus,
          );
          logger.info(
            `Tx [${tx.txId}] was already completed but order [${orderId}] was left in [${transition.expectedOrderStatus}]. Order is now [${orderStatus}]`,
          );
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing stuck completed tx [${tx.txId}]: ${e}`,
        );
        logger.warn(e.stack);
      }
    }
    if (txs.length > 0)
      logger.info(`Processed [${txs.length}] stuck completed transactions`);
  };

  /**
   * sends request to sign tx
   * @param tx transaction record
   */
  static processApprovedTx = async (tx: TransactionEntity): Promise<void> => {
    const dbAction = DatabaseAction.getInstance();
    await dbAction.txSignSemaphore.acquire().then(async (release) => {
      try {
        const chain = ChainHandler.getInstance().getChain(tx.chain);
        const paymentTx = TransactionSerializer.fromJson(
          tx.txJson,
          ChainHandler.getInstance().getChain,
        );
        await dbAction.setTxStatus(tx.txId, TransactionStatus.inSign);
        chain
          .signTransaction(paymentTx, tx.requiredSign)
          .then(this.handleSuccessfulSign)
          .catch(async (e) => await this.handleFailedSign(tx.txId, e));
        logger.info(`Tx [${tx.txId}] got sent to the signer`);
        release();
      } catch (e) {
        logger.warn(
          `Unexpected error occurred while sending tx [${tx.txId}] to sign: ${e}`,
        );
        logger.warn(e.stack);
        release();
      }
    });
  };

  /**
   * updates database tx to signed tx
   * @param tx
   */
  static handleSuccessfulSign = async (
    tx: PaymentTransaction,
  ): Promise<void> => {
    logger.info(`Tx [${tx.txId}] is signed successfully`);
    await DatabaseAction.getInstance().updateWithSignedTx(tx.txId, tx.toJson());
  };

  /**
   * updates tx status to sign-failed
   * @param tx
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static handleFailedSign = async (txId: string, e: any): Promise<void> => {
    logger.warn(`An error occurred while signing tx [${txId}]: ${e}`);
    await DatabaseAction.getInstance().setTxAsSignFailed(txId);
  };

  /**
   * sets tx as sign-failed if enough time past from the request to sign
   * @param tx transaction record
   */
  static processInSignTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    const paymentTx = TransactionSerializer.fromJson(
      tx.txJson,
      ChainHandler.getInstance().getChain,
    );
    if (await chain.isTransactionInSign(paymentTx)) {
      logger.info(`Signer is still signing tx [${tx.txId}]`);
    } else {
      logger.warn(
        `Signer does not have tx [${tx.txId}]. Updating status to sign-failed`,
      );
      await DatabaseAction.getInstance().setTxAsSignFailed(tx.txId);
    }
  };

  /**
   * revalidates tx, request to sign again if it's still valid, otherwise sets as invalid
   * @param tx transaction record
   */
  static processSignFailedTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    // TODO: Remove this if and implement a general way to reduce confirmation check frequency
    // local:ergo/rosen-bridge/guard-service#447
    if (tx.chain === DOGE_CHAIN) {
      // in case of Doge, we only check confirmation of sign-failed txs in 10% of times (configurable with default value of 10)
      if (
        Math.random() >
        GuardsDogeConfigs.signFailedConfirmationCheckPercent / 100
      ) {
        logger.info(
          `Ignored confirmation check for Doge tx [${tx.txId}]. Requesting to sign tx...`,
        );
        await this.processApprovedTx(tx);
        return;
      } else {
        logger.info(`Checking confirmation status for Doge tx [${tx.txId}]...`);
      }
    }
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType,
    );
    if (
      txConfirmation !== ConfirmationStatus.NotFound ||
      (await chain.isTxInMempool(tx.txId))
    ) {
      // tx found in network. set status as sent
      logger.info(
        `Tx [${tx.txId}] found in blockchain. Updating status to 'sent'`,
      );
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.sent,
      );
    } else {
      // tx is not found, checking if tx is still valid
      const paymentTx = TransactionSerializer.fromJson(
        tx.txJson,
        ChainHandler.getInstance().getChain,
      );
      const validityStatus = await chain.isTxValid(
        paymentTx,
        SigningStatus.UnSigned,
      );
      if (validityStatus.isValid) {
        // tx is valid, requesting to sign...
        logger.info(`Tx [${tx.txId}] is still valid. Requesting to sign tx...`);
        const height = await chain.getHeight();
        await DatabaseAction.getInstance().updateTxLastCheck(tx.txId, height);
        await this.processApprovedTx(tx);
      } else {
        // tx is invalid, reset status if enough blocks past.
        await this.setTransactionAsInvalid(tx, chain, validityStatus.details);
      }
    }
  };

  /**
   * submits tx to blockchain
   * @param tx transaction record
   */
  static processSignedTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    const paymentTx = TransactionSerializer.fromJson(
      tx.txJson,
      ChainHandler.getInstance().getChain,
    );
    await chain.submitTransaction(paymentTx);
    await DatabaseAction.getInstance().setTxStatus(
      tx.txId,
      TransactionStatus.sent,
    );
  };

  /**
   * processes the transaction that has been sent before
   * @param tx transaction record
   */
  static processSentTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    // TODO: Remove this if and implement a general way to reduce confirmation check frequency
    // local:ergo/rosen-bridge/guard-service#447
    if (tx.chain === DOGE_CHAIN) {
      // in case of Doge, we only check confirmation of sign-failed txs in 60% of times (configurable with default value of 60)
      if (
        Math.random() >
        GuardsDogeConfigs.sentConfirmationCheckPercent / 100
      ) {
        logger.info(`Ignored confirmation check for Doge tx [${tx.txId}].`);
        return;
      } else {
        logger.info(`Checking confirmation status for Doge tx [${tx.txId}]...`);
      }
    }
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType,
    );
    switch (txConfirmation) {
      case ConfirmationStatus.ConfirmedEnough: {
        // tx confirmed enough, proceed to next process
        // compute the event/order move before writing anything: it throws
        // for a tx that is missing its event/order, and that must not
        // happen after the tx is already set as completed
        const transition = this.getCompletedTxTransition(tx);
        // set the tx as completed and move its event/order in a single
        // database transaction, so a failure between the two writes
        // cannot leave the event/order behind
        await DatabaseAction.getInstance().setTxAsCompleted(
          tx.txId,
          transition?.eventId,
          transition?.eventStatus,
          transition?.setEventFirstTry ?? false,
          transition?.orderId,
          transition?.orderStatus,
        );
        if (transition?.eventStatus === EventStatus.pendingReward) {
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${transition.eventId}] is ready for reward distribution`,
          );
        } else if (transition?.eventId !== undefined) {
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${transition.eventId}] is complete`,
          );
        } else if (transition?.orderId !== undefined) {
          logger.info(
            `Tx [${tx.txId}] is confirmed. Order [${transition.orderId}] is complete`,
          );
        } else {
          // no need to do anything about event, just log that tx confirmed
          logger.info(
            `Tx [${tx.txId}] with type [${tx.type}] in chain [${tx.chain}] is confirmed`,
          );
        }
        break;
      }
      case ConfirmationStatus.NotConfirmedEnough: {
        // tx is mined, but not enough confirmation, updating last check...
        const height = await chain.getHeight();
        await DatabaseAction.getInstance().updateTxLastCheck(tx.txId, height);
        logger.info(`Tx [${tx.txId}] is in confirmation process`);
        break;
      }
      case ConfirmationStatus.NotFound: {
        // tx is not mined, checking mempool...
        if (await chain.isTxInMempool(tx.txId)) {
          // tx is in mempool, updating last check...
          const height = await chain.getHeight();
          await DatabaseAction.getInstance().updateTxLastCheck(tx.txId, height);
          logger.info(`Tx [${tx.txId}] is in mempool`);
        } else {
          // tx is not in mempool, checking if tx is still valid
          const paymentTx = TransactionSerializer.fromJson(
            tx.txJson,
            ChainHandler.getInstance().getChain,
          );
          const validityStatus = await chain.isTxValid(
            paymentTx,
            SigningStatus.Signed,
          );
          if (validityStatus.isValid) {
            // tx is valid. resending...
            logger.info(`Tx [${tx.txId}] is still valid. Resending tx...`);
            await chain.submitTransaction(paymentTx);
          } else {
            // tx is invalid. reset status if enough blocks past.
            await this.setTransactionAsInvalid(
              tx,
              chain,
              validityStatus.details,
            );
          }
        }
      }
    }
  };

  /**
   * resets status of event (if tx is related to any event) and set tx as invalid if enough blocks past from last check
   * @param tx transaction record
   * @param chain AbstractChain object
   * @param invalidationDetails reason of invalidation with unexpectedness status
   */
  static setTransactionAsInvalid = async (
    tx: TransactionEntity,
    chain: AbstractChain<unknown>,
    invalidationDetails:
      | {
          reason: string;
          unexpected: boolean;
        }
      | undefined,
  ): Promise<void> => {
    if (invalidationDetails === undefined)
      throw new ImpossibleBehavior(
        `Tx [${tx.txId}] is invalid but no reason is provided`,
      );
    const height = await chain.getHeight();
    if (
      height - tx.lastCheck >=
      ChainHandler.getInstance()
        .getChain(tx.chain)
        .getTxRequiredConfirmation(tx.type as TransactionType)
    ) {
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.invalid,
      );
      if (invalidationDetails.unexpected) {
        // send notification if invalidation reason is unexpected
        await NotificationHandler.getInstance().notify(
          'warning',
          `Tx is invalid`,
          `Tx [${tx.txId}] on chain [${tx.chain}] is invalid due to reason: ${invalidationDetails.reason}`,
        );
      }
      switch (tx.type) {
        case TransactionType.payment:
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingPayment,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for payment. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.reward:
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingReward,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for reward distribution. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.arbitrary:
          if (!tx.order)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no order associated with it`,
            );

          await DatabaseAction.getInstance().setOrderStatus(
            tx.order.id,
            OrderStatus.pending,
            false,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Order [${tx.order.id}] is now waiting for payment. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.coldStorage:
          logger.info(
            `Cold storage tx [${tx.txId}] is invalid. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.manual:
          logger.warn(
            `Manual tx [${tx.txId}] is invalid. Reason: ${invalidationDetails.reason}`,
          );
          break;
      }
    } else {
      logger.info(
        `Tx [${tx.txId}] is invalid. Waiting for enough confirmation of this proposition. Reason: ${invalidationDetails.reason}`,
      );
    }
  };
}

export default TransactionProcessor;
