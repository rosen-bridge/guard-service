import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import { TokenHandler } from '../handlers/tokenHandler';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { DuplicateOrder, DuplicateTransaction } from '../utils/errors';
import { DatabaseAction } from './databaseAction';
import { ArbitraryEntity } from './entities/arbitraryEntity';
import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { TransactionEntity } from './entities/transactionEntity';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

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
    overwrite = false,
  ): Promise<void> => {
    await DatabaseAction.getInstance()
      .txSignSemaphore.acquire()
      .then(async (release) => {
        try {
          switch (newTx.txType) {
            case TransactionType.payment:
            case TransactionType.reward: {
              const event = await DatabaseAction.getInstance().getEventById(
                newTx.eventId,
              );
              if (event === null)
                throw new Error(`Event [${newTx.eventId}] not found`);
              await this.insertEventOrOderTx(newTx, event, null, requiredSign);
              break;
            }
            case TransactionType.manual: {
              await this.insertManualTx(newTx, requiredSign, overwrite);
              break;
            }
            case TransactionType.coldStorage: {
              await this.insertColdStorageTx(newTx, requiredSign);
              break;
            }
            case TransactionType.arbitrary: {
              const order = await DatabaseAction.getInstance().getOrderById(
                newTx.eventId,
              );
              if (order === null)
                throw new Error(`Order [${newTx.eventId}] not found`);
              await this.insertEventOrOderTx(newTx, null, order, requiredSign);
              break;
            }
          }
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
   * @param order the arbitrary order
   * @param requiredSign
   */
  private static insertEventOrOderTx = async (
    newTx: PaymentTransaction,
    event: ConfirmedEventEntity | null,
    order: ArbitraryEntity | null,
    requiredSign: number,
  ): Promise<void> => {
    let txs: TransactionEntity[];
    let eventOrOrderId: string;
    if (event !== null) {
      txs = await DatabaseAction.getInstance().getEventValidTxsByType(
        event.id,
        newTx.txType,
      );
      eventOrOrderId = event.id;
    } else if (order !== null) {
      txs = await DatabaseAction.getInstance().getOrderValidTxs(order.id);
      eventOrOrderId = order.id;
    } else {
      throw new ImpossibleBehavior(
        `The Order nor the event is passed while inserting tx [${newTx.txId}]`,
      );
    }
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`,
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.txId === newTx.txId) {
        logger.info(
          `Reinsertion for tx [${tx.txId}], 'failedInSign' updated to false`,
        );
        await DatabaseAction.getInstance().resetFailedInSign(tx.txId);
      } else {
        if (tx.status === TransactionStatus.approved) {
          if (newTx.txId < tx.txId) {
            logger.info(
              `Replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`,
            );
            await DatabaseAction.getInstance().replaceTx(tx.txId, newTx);
          } else
            logger.info(
              `Ignoring new tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`,
            );
        } else {
          throw new Error(
            `Received approval for newTx [${newTx.txId}] where its ${
              event !== null ? `event` : `order`
            } [${eventOrOrderId}] has already an advanced oldTx [${tx.txId}]`,
          );
        }
      }
    } else
      await DatabaseAction.getInstance().insertNewTx(
        newTx,
        event,
        requiredSign,
        order,
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
    requiredSign: number,
  ): Promise<void> => {
    const txs =
      await DatabaseAction.getInstance().getActiveColdStorageTxsInChain(
        newTx.network,
      );
    if (txs.some((tx) => tx.txId === newTx.txId)) {
      logger.info(
        `Reinsertion for cold storage tx [${newTx.txId}], 'failedInSign' updated to false`,
      );
      await DatabaseAction.getInstance().resetFailedInSign(newTx.txId);
    } else
      await DatabaseAction.getInstance().insertNewTx(
        newTx,
        null,
        requiredSign,
        null,
      );
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
    overwrite: boolean,
  ): Promise<void> => {
    const txs = await DatabaseAction.getInstance().getTxById(newTx.txId);
    if (txs) {
      if (!overwrite) {
        throw new DuplicateTransaction(
          `Tx [${newTx.txId}] is already in database with status [${txs.status}]`,
        );
      } else {
        await DatabaseAction.getInstance().updateRequiredSign(
          newTx.txId,
          requiredSign,
        );
      }
    } else {
      await DatabaseAction.getInstance().insertNewTx(
        newTx,
        null,
        requiredSign,
        null,
      );
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
        const tokenIdOnErgo = TokenHandler.getInstance()
          .getTokenMap()
          .getID(
            TokenHandler.getInstance()
              .getTokenMap()
              .search(event.eventData.fromChain, {
                tokenId: event.eventData.sourceChainTokenId,
              })[0],
            ERGO_CHAIN,
          );
        requiredTokenIds.add(tokenIdOnErgo);
      }
    });

    return Array.from(requiredTokenIds);
  };

  /**
   * inserts an arbitrary order into database
   * if already another approved tx exists, keeps the one with loser txId
   * @param id order id
   * @param chain order chain
   * @param orderJson the encoded order
   */
  static insertOrder = async (
    id: string,
    chain: string,
    orderJson: string,
  ): Promise<void> => {
    const dbAction = DatabaseAction.getInstance();
    const order = await dbAction.getOrderById(id);
    if (order) {
      throw new DuplicateOrder(
        `Order [${id}] is already in database on chain [${chain}] with status [${order.status}]`,
      );
    } else {
      await dbAction.insertNewOrder(id, chain, orderJson);
    }
  };
}

export default DatabaseHandler;
