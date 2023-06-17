import {
  ChainUtils,
  EventTrigger,
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import ChainHandler from '../handlers/ChainHandler';
import { loggerFactory } from '../log/Logger';
import { isEqual } from 'lodash-es';
import EventOrder from '../event/EventOrder';
import MinimumFee from '../event/MinimumFee';

const logger = loggerFactory(import.meta.url);

class TransactionVerifier {
  /**
   * verifies the transaction
   * conditions:
   * - fee is verified
   * - verify no token is burned
   * - chain extra conditions are verified
   * @param tx the created payment transaction
   */
  static verifyTxCommonConditions = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify tx fee
    if (!chain.verifyTransactionFee(tx)) {
      logger.debug(`Transaction [${tx.txId}] is invalid: Fee is not verified`);
      return false;
    }

    // verify no token is burned
    if (!(await chain.verifyNoTokenBurned(tx))) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Some token are burned`
      );
      return false;
    }

    // verify extra conditions
    if (!chain.verifyTransactionExtraConditions(tx)) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Extra conditions is not verified`
      );
      return false;
    }

    return true;
  };

  /**
   * verifies the transaction
   * conditions:
   * - tx order is equal to expected event order
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyEventTransaction = async (
    tx: PaymentTransaction,
    event: EventTrigger
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify tx order
    const feeConfig = await MinimumFee.getEventFeeConfig(event);
    const txOrder = chain.extractTransactionOrder(tx);
    const expectedOrder =
      tx.txType === TransactionTypes.payment
        ? await EventOrder.createEventPaymentOrder(event, feeConfig)
        : await EventOrder.createEventRewardOrder(event, feeConfig);
    if (!isEqual(txOrder, expectedOrder)) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Tx extracted order is not verified`
      );
      return false;
    }

    return true;
  };

  /**
   * verifies the cold storage transaction
   * conditions:
   * - address remaining assets are more than low threshold
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyColdStorageTransaction = async (
    // TODO: add tests for this function (#241)
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify address assets (TODO: implement this section (#241))
    const txOrder = chain.extractTransactionOrder(tx);
    const lockedAssets = await chain.getLockAddressAssets();
    const remainingAssets = ChainUtils.subtractAssetBalance(
      lockedAssets,
      txOrder[0].assets
    );

    return true;
  };
}

export default TransactionVerifier;
