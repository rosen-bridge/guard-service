import {
  AbstractChain,
  ConfirmationStatus,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { dbAction } from '../db/DatabaseAction';
import { TransactionEntity } from '../db/entities/TransactionEntity';
import ChainHandler from '../handlers/ChainHandler';
import { loggerFactory } from '../log/Logger';
import { EventStatus, TransactionStatus } from '../models/Models';
import { guardConfig } from '../helpers/GuardConfig';
import Configs from '../helpers/Configs';
import TransactionSerializer from './TransactionSerializer';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

const logger = loggerFactory(import.meta.url);

class TransactionProcessor {
  /**
   * processes all active transactions in the database
   */
  static processTransactions = async (): Promise<void> => {
    logger.info(`Processing transactions`);
    const txs = await dbAction.getActiveTransactions();
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
    await dbAction.txSignSemaphore.acquire().then(async (release) => {
      try {
        const chain = ChainHandler.getInstance().getChain(tx.chain);
        const paymentTx = TransactionSerializer.fromJson(tx.txJson);
        await chain.signTransaction(paymentTx, guardConfig.requiredSign);
        logger.info(`Tx [${tx.txId}] got sent to the signer`);
        await dbAction.setTxStatus(tx.txId, TransactionStatus.inSign);
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
      await dbAction.setTxStatus(tx.txId, TransactionStatus.signFailed);
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
      tx.type
    );
    if (
      txConfirmation !== ConfirmationStatus.NotFound ||
      (await chain.isTxInMempool(tx.txId))
    ) {
      // tx found in network. set status as sent
      logger.info(
        `Tx [${tx.txId}] found in blockchain. Updating status to 'sent'`
      );
      await dbAction.setTxStatus(tx.txId, TransactionStatus.sent);
    } else {
      // tx is not found, checking if tx is still valid
      const paymentTx = TransactionSerializer.fromJson(tx.txJson);
      if (await chain.isTxValid(paymentTx)) {
        // tx is valid, requesting to sign...
        logger.info(`Tx [${tx.txId}] is still valid. Requesting to sign tx...`);
        await this.processApprovedTx(tx);
      } else {
        // tx is invalid, reset status if enough blocks past.
        await this.setTransactionAsInvalid(tx, chain);
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
    await dbAction.setTxStatus(tx.txId, TransactionStatus.sent);
  };

  /**
   * processes the transaction that has been sent before
   * @param tx transaction record
   */
  static processSentTx = async (tx: TransactionEntity): Promise<void> => {
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type
    );
    switch (txConfirmation) {
      case ConfirmationStatus.ConfirmedEnough: {
        // tx confirmed enough, proceed to next process
        await dbAction.setTxStatus(tx.txId, TransactionStatus.completed);
        if (tx.type === TransactionTypes.payment && tx.chain !== ERGO_CHAIN) {
          // set event status, to start reward distribution
          await dbAction.setEventStatusToPending(
            tx.event.id,
            EventStatus.pendingReward
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is ready for reward distribution`
          );
        } else if (
          tx.type === TransactionTypes.reward ||
          (tx.type === TransactionTypes.payment && tx.chain === ERGO_CHAIN)
        ) {
          // set event as complete
          await dbAction.setEventStatus(tx.event.id, EventStatus.completed);
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is complete`
          );
        } else {
          // no need to do anything about event, just log that tx confirmed
          logger.info(
            `Cold storage tx [${tx.txId}] in chain [${tx.chain}] is confirmed`
          );
        }
        break;
      }
      case ConfirmationStatus.NotConfirmedEnough: {
        // tx is mined, but not enough confirmation, updating last check...
        const height = await chain.getHeight();
        await dbAction.updateTxLastCheck(tx.txId, height);
        logger.info(`Tx [${tx.txId}] is in confirmation process`);
        break;
      }
      case ConfirmationStatus.NotFound: {
        // tx is not mined, checking mempool...
        if (await chain.isTxInMempool(tx.txId)) {
          // tx is in mempool, updating last check...
          const height = await chain.getHeight();
          await dbAction.updateTxLastCheck(tx.txId, height);
          logger.info(`Tx [${tx.txId}] is in mempool`);
        } else {
          // tx is not in mempool, checking if tx is still valid
          const paymentTx = TransactionSerializer.fromJson(tx.txJson);
          if (await chain.isTxValid(paymentTx)) {
            // tx is valid. resending...
            logger.info(`Tx [${tx.txId}] is still valid. Resending tx...`);
            await chain.submitTransaction(paymentTx);
          } else {
            // tx is invalid. reset status if enough blocks past.
            await this.setTransactionAsInvalid(tx, chain);
          }
        }
      }
    }
  };

  /**
   * resets status of event (if tx is related to any event) and set tx as invalid if enough blocks past from last check
   * @param tx transaction record
   * @param chain AbstractChain object
   */
  static setTransactionAsInvalid = async (
    tx: TransactionEntity,
    chain: AbstractChain
  ): Promise<void> => {
    const height = await chain.getHeight();
    if (
      height - tx.lastCheck >=
      ChainHandler.getInstance().getRequiredConfirmation(tx.chain, tx.type)
    ) {
      await dbAction.setTxStatus(tx.txId, TransactionStatus.invalid);
      switch (tx.type) {
        case TransactionTypes.payment:
          await dbAction.setEventStatusToPending(
            tx.event.id,
            EventStatus.pendingPayment
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for payment`
          );
          break;
        case TransactionTypes.reward:
          await dbAction.setEventStatusToPending(
            tx.event.id,
            EventStatus.pendingReward
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for reward distribution`
          );
          break;
        case TransactionTypes.coldStorage:
          logger.info(`Cold storage tx [${tx.txId}] is invalid`);
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
