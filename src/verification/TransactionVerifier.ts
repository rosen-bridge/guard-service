import {
  ChainUtils,
  EventTrigger,
  PaymentOrder,
  PaymentTransaction,
} from '@rosen-chains/abstract-chain';
import ChainHandler from '../handlers/ChainHandler';
import { loggerFactory } from '../log/Logger';
import { isEqual } from 'lodash-es';

const logger = loggerFactory(import.meta.url);

class TransactionVerifier {
  /**
   * verifies the transaction
   * conditions:
   * - fee is verified
   * - tx order is equal to expected event order
   * - verify no token is burned
   * - chain extra conditions are verified
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyEventTransaction = async (
    tx: PaymentTransaction,
    event: EventTrigger
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify tx fee
    if (!chain.verifyTransactionFee(tx)) {
      logger.debug(`Transaction [${tx.txId}] is invalid: Fee is not verified`);
      return false;
    }

    // verify tx order
    const txOrder = chain.extractTransactionOrder(tx);
    const expectedOrder: PaymentOrder = []; // TODO
    if (!isEqual(txOrder, expectedOrder)) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Tx extracted order is not verified`
      );
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
    if (!(await chain.verifyTransactionExtraConditions(tx))) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Extra conditions is not verified`
      );
      return false;
    }

    return true;
  };

  /**
   * verifies the cold storage transaction
   * conditions:
   * - fee is verified
   * - verify no token is burned
   * - chain extra conditions are verified
   * - address remaining assets are more than low threshold
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyColdStorageTransaction = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify tx fee
    if (!chain.verifyTransactionFee(tx)) {
      logger.debug(
        `Cold storage transaction [${tx.txId}] is invalid: Fee is not verified`
      );
      return false;
    }

    // verify no token is burned
    if (!(await chain.verifyNoTokenBurned(tx))) {
      logger.debug(
        `Cold storage transaction [${tx.txId}] is invalid: Some token are burned`
      );
      return false;
    }

    // verify extra conditions
    if (!chain.verifyTransactionExtraConditions(tx)) {
      logger.debug(
        `Cold storage transaction [${tx.txId}] is invalid: Extra conditions is not verified`
      );
      return false;
    }

    // verify address assets (TODO)
    const txOrder = chain.extractTransactionOrder(tx);
    const lockedAssets = await chain.getLockAddressAssets();
    const remainingAssets = ChainUtils.subtractAssetBalance(
      lockedAssets,
      txOrder[0].assets
    );
    // TODO

    return true;
  };
}

export default TransactionVerifier;
