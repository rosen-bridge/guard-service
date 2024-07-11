import {
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ConfirmedEventEntity } from './entities/ConfirmedEventEntity';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { DatabaseAction } from './DatabaseAction';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { rosenConfig } from '../configs/RosenConfig';
import Configs from '../configs/Configs';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { DuplicateTransaction } from '../utils/errors';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

class DatabaseHandler {
  /**
   * inserts a new approved tx into Transaction table
   * if already another approved tx exists, keeps the one with loser txId
   * @param newTx the transaction
   * @param requiredSign
   * @param overwrite in case of manual txs, if true, requiredSign will be overwritten
   */
  static insertTx = async (
    newTx: PaymentTransaction,
    requiredSign: number,
    overwrite = false
  ): Promise<void> => {
    await DatabaseAction.getInstance()
      .txSignSemaphore.acquire()
      .then(async (release) => {
        try {
          const event = await DatabaseAction.getInstance().getEventById(
            newTx.eventId
          );
          if (
            event === null &&
            newTx.txType !== TransactionType.coldStorage &&
            newTx.txType !== TransactionType.manual
          ) {
            throw new Error(`Event [${newTx.eventId}] not found`);
          }

          if (event) await this.insertEventTx(newTx, event, requiredSign);
          else if (newTx.txType === TransactionType.manual)
            await this.insertManualTx(newTx, requiredSign, overwrite);
          else await this.insertColdStorageTx(newTx, requiredSign);
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
   * @param requiredSign
   */
  private static insertEventTx = async (
    newTx: PaymentTransaction,
    event: ConfirmedEventEntity,
    requiredSign: number
  ): Promise<void> => {
    const txs = await DatabaseAction.getInstance().getEventValidTxsByType(
      event.id,
      newTx.txType
    );
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.txId === newTx.txId) {
        logger.info(
          `Reinsertion for tx [${tx.txId}], 'failedInSign' updated to false`
        );
        await DatabaseAction.getInstance().resetFailedInSign(tx.txId);
      } else {
        if (tx.status === TransactionStatus.approved) {
          if (newTx.txId < tx.txId) {
            logger.info(
              `Replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`
            );
            await DatabaseAction.getInstance().replaceTx(tx.txId, newTx);
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
    } else
      await DatabaseAction.getInstance().insertNewTx(
        newTx,
        event,
        requiredSign
      );
  };

  /**
   * inserts a new approved cold storage tx into Transaction table
   * if already another approved tx exists, keeps the one with loser txId
   * @param newTx the transaction
   * @param requiredSign
   */
  private static insertColdStorageTx = async (
    newTx: PaymentTransaction,
    requiredSign: number
  ): Promise<void> => {
    const txs =
      await DatabaseAction.getInstance().getNonCompleteColdStorageTxsInChain(
        newTx.network
      );
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Chain [${newTx.network}] has already more than 1 (${txs.length}) active cold storage tx`
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.txId === newTx.txId) {
        logger.info(
          `Reinsertion for cold storage tx [${tx.txId}], 'failedInSign' updated to false`
        );
        await DatabaseAction.getInstance().resetFailedInSign(tx.txId);
      } else {
        if (tx.status === TransactionStatus.approved) {
          if (newTx.txId < tx.txId) {
            logger.info(
              `Replacing cold storage tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`
            );
            await DatabaseAction.getInstance().replaceTx(tx.txId, newTx);
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
    } else
      await DatabaseAction.getInstance().insertNewTx(newTx, null, requiredSign);
  };

  /**
   * inserts a new manual generated tx into Transaction table
   * throws error if tx is already exists
   * updates required sign if overwrite key is passed
   * @param newTx the transaction
   * @param requiredSign
   * @param overwrite in case of manual txs, if true, requiredSign will be overwritten
   */
  private static insertManualTx = async (
    newTx: PaymentTransaction,
    requiredSign: number,
    overwrite: boolean
  ): Promise<void> => {
    const txs = await DatabaseAction.getInstance().getTxById(newTx.txId);
    if (txs) {
      if (!overwrite) {
        throw new DuplicateTransaction(
          `Tx [${newTx.txId}] is already in database with status [${txs.status}].`
        );
      } else {
        await DatabaseAction.getInstance().updateRequiredSign(
          newTx.txId,
          requiredSign
        );
      }
    } else {
      await DatabaseAction.getInstance().insertNewTx(newTx, null, requiredSign);
    }
  };

  /**
   * extracts tokens that are required in waiting events
   * considers emission token if event is pending a transaction on Ergo
   * @returns list of token ids
   */
  static getWaitingEventsRequiredTokens = async (): Promise<string[]> => {
    const waitingEvents =
      await DatabaseAction.getInstance().getEventsByStatuses([
        EventStatus.paymentWaiting,
        EventStatus.rewardWaiting,
      ]);
    const requiredTokenIds = new Set<string>();
    waitingEvents.forEach((event) => {
      if (event.status === EventStatus.paymentWaiting) {
        requiredTokenIds.add(event.eventData.targetChainTokenId);
        if (event.eventData.toChain === ERGO_CHAIN)
          requiredTokenIds.add(GuardsErgoConfigs.emissionTokenId);
      } else {
        requiredTokenIds.add(GuardsErgoConfigs.emissionTokenId);
        const tokenIdOnErgo = Configs.tokenMap.getID(
          Configs.tokenMap.search(event.eventData.fromChain, {
            [Configs.tokenMap.getIdKey(event.eventData.fromChain)]:
              event.eventData.sourceChainTokenId,
          })[0],
          ERGO_CHAIN
        );
        requiredTokenIds.add(tokenIdOnErgo);
      }
    });

    return Array.from(requiredTokenIds);
  };
}

export default DatabaseHandler;
