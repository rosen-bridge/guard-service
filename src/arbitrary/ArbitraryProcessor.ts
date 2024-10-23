import Configs from '../configs/Configs';
import ChainHandler from '../handlers/ChainHandler';
import { ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import { rosenConfig } from '../configs/RosenConfig';
import TxAgreement from '../agreement/TxAgreement';
import * as TransactionSerializer from '../transaction/TransactionSerializer';
import { DatabaseAction } from '../db/DatabaseAction';
import GuardTurn from '../utils/GuardTurn';
import GuardPkHandler from '../handlers/GuardPkHandler';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { NotificationHandler } from '../handlers/NotificationHandler';
import { OrderStatus, OrderUnexpectedFailsLimit } from '../utils/constants';
import {
  ChainUtils,
  NotEnoughAssetsError,
  PaymentOrder,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class ArbitraryProcessor {
  private static instance: ArbitraryProcessor;

  protected constructor() {
    logger.debug('ArbitraryProcessor is instantiated');
  }

  /**
   * generates a ArbitraryProcessor object if it doesn't exist
   * @returns ArbitraryProcessor instance
   */
  public static getInstance = () => {
    if (!ArbitraryProcessor.instance) {
      logger.debug(
        "ArbitraryProcessor instance didn't exist. Creating a new one"
      );
      ArbitraryProcessor.instance = new ArbitraryProcessor();
    }
    return ArbitraryProcessor.instance;
  };

  /**
   * processes pending orders in the database
   */
  processArbitraryOrders = async (): Promise<void> => {
    logger.info('Processing arbitrary orders');
    const pendingOrders = await DatabaseAction.getInstance().getOrdersByStatus(
      OrderStatus.pending
    );
    for (const order of pendingOrders) {
      if (GuardTurn.guardTurn() !== GuardPkHandler.getInstance().guardId) {
        logger.info(`Turn is over. Abort process of arbitrary orders`);
        break;
      }
      try {
        // check how many times order txs unexpectedly failed
        if (order.unexpectedFails >= OrderUnexpectedFailsLimit) {
          logger.warn(
            `Arbitrary order [${order.id}] will no longer be processed due to too much unexpected failures`
          );
          await DatabaseAction.getInstance().setOrderStatus(
            order.id,
            OrderStatus.reachedLimit
          );
          continue;
        }
        // process order
        try {
          const paymentOrder = ChainUtils.decodeOrder(order.orderJson);
          const tx = await this.createOrderPayment(
            order.id,
            paymentOrder,
            order.chain
          );
          if (GuardTurn.guardTurn() === GuardPkHandler.getInstance().guardId)
            (await TxAgreement.getInstance()).addTransactionToQueue(tx);
          else
            logger.info(
              `Tx [${tx.txId}] is generated but turn is over. No tx will be added to Agreement queue`
            );
        } catch (e) {
          if (e instanceof NotEnoughAssetsError) {
            logger.warn(
              `Failed to create payment for arbitrary order [${order.id}]: ${e}`
            );
            if (e.stack) logger.warn(e.stack);
            await NotificationHandler.getInstance().notify(
              'error',
              `Low Assets in ${order.chain}`,
              `Failed to create payment for arbitrary order [${order.id}] due to low assets: ${e}`
            );
            await DatabaseAction.getInstance().setOrderStatus(
              order.id,
              OrderStatus.waiting
            );
          } else throw e;
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing arbitrary order [${order.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(`Processed [${pendingOrders.length}] pending arbitrary orders`);
  };

  /**
   * creates an unsigned transaction for the order on the target chain
   * @param orderId the order ID
   * @param order the payment order
   * @param chain
   * @returns created unsigned transaction
   */
  protected createOrderPayment = async (
    orderId: string,
    order: PaymentOrder,
    chain: string
  ): Promise<PaymentTransaction> => {
    const targetChain = ChainHandler.getInstance().getChain(chain);

    const extra: any[] = [];

    // add guard config box if chain is ergo
    if (chain === ERGO_CHAIN) {
      const ergoChain = targetChain as ErgoChain;

      const guardsConfigBox = await ergoChain.getGuardsConfigBox(
        rosenConfig.guardNFT,
        rosenConfig.guardSignAddress
      );

      // add event and commitment boxes to generateTransaction arguments
      extra.push([], [guardsConfigBox]);
    }

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions = (
      await TxAgreement.getInstance()
    ).getChainPendingTransactions(chain);
    const unsignedQueueTransactions = (
      await DatabaseAction.getInstance().getUnsignedActiveTxsInChain(chain)
    ).map((txEntity) => TransactionSerializer.fromJson(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await DatabaseAction.getInstance().getSignedActiveTxsInChain(chain)
    ).map((txEntity) =>
      Buffer.from(
        TransactionSerializer.fromJson(txEntity.txJson).txBytes
      ).toString('hex')
    );

    // generate transaction
    return targetChain.generateTransaction(
      orderId,
      TransactionType.arbitrary,
      order,
      [...unsignedAgreementTransactions, ...unsignedQueueTransactions],
      signedTransactions,
      ...extra
    );
  };

  /**
   * searches event triggers in the database with more than leftover confirmation and timeout them
   */
  TimeoutLeftoverOrders = async (): Promise<void> => {
    logger.info('Searching for leftover arbitrary orders');
    const pendingOrders = await DatabaseAction.getInstance().getOrdersByStatus(
      OrderStatus.pending
    );

    let timeoutOrdersCount = 0;
    for (const order of pendingOrders) {
      try {
        if (
          Math.round(Date.now() / 1000) >
          Number(order.firstTry) + Configs.orderTimeout
        ) {
          await DatabaseAction.getInstance().setOrderStatus(
            order.id,
            OrderStatus.timeout
          );
          timeoutOrdersCount += 1;
          logger.info(`Arbitrary order [${order.id}] is timed out`);
        }
      } catch (e) {
        logger.warn(
          `An error occurred while processing leftover arbitrary order [${order.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(
      `Processed [${pendingOrders.length}] pending arbitrary orders, timeout [${timeoutOrdersCount}] of them`
    );
  };

  /**
   * updates all waiting arbitrary orders status to pending
   */
  RequeueWaitingOrders = async (): Promise<void> => {
    logger.info('Processing waiting arbitrary orders');
    const waitingOrders = await DatabaseAction.getInstance().getOrdersByStatus(
      OrderStatus.waiting
    );

    let requeueOrdersCount = 0;
    for (const order of waitingOrders) {
      try {
        await DatabaseAction.getInstance().setOrderStatus(
          order.id,
          OrderStatus.pending,
          true
        );
        requeueOrdersCount += 1;
      } catch (e) {
        logger.warn(
          `An error occurred while processing waiting arbitrary order [${order.id}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
    logger.info(
      `Processed [${waitingOrders.length}] waiting arbitrary orders, requeue [${requeueOrdersCount}] of them`
    );
  };
}

export default ArbitraryProcessor;
