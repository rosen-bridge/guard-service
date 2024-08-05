import {
  AbstractChain,
  ConfirmationStatus,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { SigningStatus } from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import Configs from '../configs/Configs';
import { DatabaseAction } from '../db/DatabaseAction';
import { TransactionEntity } from '../db/entities/TransactionEntity';
import ChainHandler from '../handlers/ChainHandler';
import { EventStatus, TransactionStatus } from '../utils/constants';
import * as TransactionSerializer from './TransactionSerializer';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

class TransactionProcessor {
  /**
   * processes all active transactions in the database
   */
  static processTransactions = async (): Promise<void> => {
    logger.info(`Processing transactions`);
    const txs = await DatabaseAction.getInstance().getActiveTransactions();
    for (const tx of txs) {
      logger.info(
        `Processing transaction [${tx.txId}] with status [${tx.status}]`
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
        const paymentTx = TransactionSerializer.fromJson(tx.txJson);
        await dbAction.setTxStatus(tx.txId, TransactionStatus.inSign);
        chain
          .signTransaction(paymentTx, tx.requiredSign)
          .then(this.handleSuccessfulSign)
          .catch(async (e) => await this.handleFailedSign(tx.txId, e));
        logger.info(`Tx [${tx.txId}] got sent to the signer`);
        release();
      } catch (e) {
        logger.warn(
          `Unexpected error occurred while sending tx [${tx.txId}] to sign: ${e}`
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
    tx: PaymentTransaction
  ): Promise<void> => {
    logger.info(`Tx [${tx.txId}] is signed successfully`);
    const currentHeight = await ChainHandler.getInstance()
      .getChain(tx.network)
      .getHeight();
    await DatabaseAction.getInstance().updateWithSignedTx(
      tx.txId,
      tx.toJson(),
      currentHeight
    );
  };

  /**
   * updates tx status to sign-failed
   * @param tx
   */
  static handleFailedSign = async (txId: string, e: any): Promise<void> => {
    logger.warn(`An error occurred while signing tx [${txId}]: ${e}`);
    await DatabaseAction.getInstance().setTxAsSignFailed(txId);
  };

  /**
   * sets tx as sign-failed if enough time past from the request to sign
   * @param tx transaction record
   */
  static processInSignTx = async (tx: TransactionEntity): Promise<void> => {
    if (
      Math.round(Date.now() / 1000) >
      Number(tx.lastStatusUpdate) + Configs.txSignTimeout
    ) {
      logger.warn(
        `No response received from signer for tx [${tx.txId}]. Updating status to sign-failed`
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
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType
    );
    if (
      txConfirmation !== ConfirmationStatus.NotFound ||
      (await chain.isTxInMempool(tx.txId))
    ) {
      // tx found in network. set status as sent
      logger.info(
        `Tx [${tx.txId}] found in blockchain. Updating status to 'sent'`
      );
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.sent
      );
    } else {
      // tx is not found, checking if tx is still valid
      const paymentTx = TransactionSerializer.fromJson(tx.txJson);
      const validityStatus = await chain.isTxValid(
        paymentTx,
        SigningStatus.UnSigned
      );
      if (validityStatus.isValid) {
        // tx is valid, requesting to sign...
        logger.info(`Tx [${tx.txId}] is still valid. Requesting to sign tx...`);
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
    const paymentTx = TransactionSerializer.fromJson(tx.txJson);
    await chain.submitTransaction(paymentTx);
    await DatabaseAction.getInstance().setTxStatus(
      tx.txId,
      TransactionStatus.sent
    );
  };

  /**
   * processes the transaction that has been sent before
   * @param tx transaction record
   */
  static processSentTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType
    );
    switch (txConfirmation) {
      case ConfirmationStatus.ConfirmedEnough: {
        // tx confirmed enough, proceed to next process
        await DatabaseAction.getInstance().setTxStatus(
          tx.txId,
          TransactionStatus.completed
        );
        if (tx.type === TransactionType.payment && tx.chain !== ERGO_CHAIN) {
          // set event status, to start reward distribution
          await DatabaseAction.getInstance().setEventStatusToPending(
            tx.event.id,
            EventStatus.pendingReward
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is ready for reward distribution`
          );
        } else if (
          tx.type === TransactionType.reward ||
          (tx.type === TransactionType.payment && tx.chain === ERGO_CHAIN)
        ) {
          // set event as complete
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.completed
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is complete`
          );
        } else {
          // no need to do anything about event, just log that tx confirmed
          logger.info(
            `Tx [${tx.txId}] with type [${tx.type}] in chain [${tx.chain}] is confirmed`
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
          const paymentTx = TransactionSerializer.fromJson(tx.txJson);
          const validityStatus = await chain.isTxValid(
            paymentTx,
            SigningStatus.UnSigned
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
              validityStatus.details
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
      | undefined
  ): Promise<void> => {
    const height = await chain.getHeight();
    if (
      height - tx.lastCheck >=
      ChainHandler.getInstance()
        .getChain(tx.chain)
        .getTxRequiredConfirmation(tx.type as TransactionType)
    ) {
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.invalid
      );
      switch (tx.type) {
        case TransactionType.payment:
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingPayment,
            invalidationDetails?.unexpected
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for payment`
          );
          break;
        case TransactionType.reward:
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingReward,
            invalidationDetails?.unexpected
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for reward distribution`
          );
          break;
        case TransactionType.coldStorage:
          logger.info(`Cold storage tx [${tx.txId}] is invalid`);
          break;
        case TransactionType.manual:
          logger.warn(`Manual tx [${tx.txId}] is invalid`);
          break;
      }
    } else {
      logger.info(
        `Tx [${tx.txId}] is invalid. Waiting for enough confirmation of this proposition`
      );
    }
  };
}

export default TransactionProcessor;
