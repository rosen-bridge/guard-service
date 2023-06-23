import {
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { dbAction } from './DatabaseAction';
import { ConfirmedEventEntity } from './entities/ConfirmedEventEntity';
import { loggerFactory } from '../log/Logger';
import { TransactionStatus } from '../models/Models';

const logger = loggerFactory(import.meta.url);

class DatabaseHandler {
  /**
   * inserts a new approved tx into Transaction table
   * if already another approved tx exists, keeps the one with loser txId
   * @param newTx the transaction
   */
  static insertTx = async (newTx: PaymentTransaction): Promise<void> => {
    await dbAction.txSignSemaphore.acquire().then(async (release) => {
      try {
        const event = await dbAction.getEventById(newTx.eventId);
        if (event === null && newTx.txType !== TransactionTypes.coldStorage) {
          throw new Error(`Event [${newTx.eventId}] not found`);
        }

        if (event) await this.insertEventTx(newTx, event);
        else await this.insertColdStorageTx(newTx);
        release();
      } catch (e) {
        release();
        throw e;
      }
    });
  };

  /**
   * inserts a new approved tx for an event into Transaction table
   * if already another approved tx exists, keeps the one with loser txId
   * @param newTx the transaction
   * @param event the event trigger
   */
  private static insertEventTx = async (
    newTx: PaymentTransaction,
    event: ConfirmedEventEntity
  ): Promise<void> => {
    const txs = await dbAction.getEventValidTxsByType(event.id, newTx.txType);
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.txId === newTx.txId) {
        `Reinsertion for tx [${tx.txId}], 'failedInSign' updated to false`;
        await dbAction.resetFailedInSign(tx.txId);
      } else {
        if (tx.status === TransactionStatus.approved) {
          if (newTx.txId < tx.txId) {
            logger.info(
              `Replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`
            );
            await dbAction.replaceTx(tx.txId, newTx);
          } else
            logger.info(
              `Ignoring new tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`
            );
        } else {
          logger.warn(
            `Received approval for newTx [${newTx.txId}] where its event [${event.id}] has already an advanced oldTx [${tx.txId}]`
          );
        }
      }
    } else await dbAction.insertNewTx(newTx, event);
  };

  /**
   * inserts a new approved cold storage tx into Transaction table
   * if already another approved tx exists, keeps the one with loser txId
   * @param newTx the transaction
   */
  private static insertColdStorageTx = async (
    newTx: PaymentTransaction
  ): Promise<void> => {
    const txs = await dbAction.getNonCompleteColdStorageTxsInChain(
      newTx.network
    );
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Chain [${newTx.network}] has already more than 1 (${txs.length}) active cold storage tx`
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.txId === newTx.txId) {
        `Reinsertion for cold storage tx [${tx.txId}], 'failedInSign' updated to false`;
        await dbAction.resetFailedInSign(tx.txId);
      } else {
        if (tx.status === TransactionStatus.approved) {
          if (newTx.txId < tx.txId) {
            logger.info(
              `Replacing cold storage tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`
            );
            await dbAction.replaceTx(tx.txId, newTx);
          } else
            logger.info(
              `Ignoring new cold storage tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`
            );
        } else {
          if (newTx.txId !== tx.txId)
            logger.warn(
              `Received approval for new tx [${newTx.txId}] where its chain [${newTx.network}] has already in progress tx [${tx.txId}]`
            );
        }
      }
    } else await dbAction.insertNewTx(newTx, null);
  };
}

export default DatabaseHandler;
