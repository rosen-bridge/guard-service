import {
  ChainUtils,
  EventTrigger,
  ImpossibleBehavior,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import ChainHandler from '../handlers/ChainHandler';
import { isEqual } from 'lodash-es';
import EventOrder from '../event/EventOrder';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';
import Configs from '../configs/Configs';
import DatabaseHandler from '../db/DatabaseHandler';
import { JsonBI } from '../network/NetworkModels';
import { DatabaseAction } from '../db/DatabaseAction';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { ChainNativeToken } from '../utils/constants';
import * as TransactionSerializer from '../transaction/TransactionSerializer';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class TransactionVerifier {
  /**
   * verifies the transaction
   * conditions:
   * - PaymentTransaction object consistency is verified
   * - fee is verified
   * - verify no token is burned
   * - chain extra conditions are verified
   * @param tx the created payment transaction
   */
  static verifyTxCommonConditions = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify PaymentTransaction object consistency
    if (!(await chain.verifyPaymentTransaction(tx))) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: tx object has inconsistency`
      );
      return false;
    }

    // verify tx fee
    if (!(await chain.verifyTransactionFee(tx))) {
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
    if (!chain.verifyTransactionExtraConditions(tx, SigningStatus.UnSigned)) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Extra conditions are not verified`
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
    const dbAction = DatabaseAction.getInstance();

    // verify tx order
    const feeConfig = MinimumFeeHandler.getEventFeeConfig(event);
    const txOrder = chain.extractTransactionOrder(tx);
    const eventWIDs = (await dbAction.getEventCommitments(tx.eventId)).map(
      (commitment) => commitment.WID
    );
    let expectedOrder: PaymentOrder = [];
    if (tx.txType === TransactionType.payment)
      expectedOrder = await EventOrder.createEventPaymentOrder(
        event,
        feeConfig,
        eventWIDs
      );
    else {
      // get event payment transaction
      const eventTxs = await dbAction.getEventValidTxsByType(
        tx.eventId,
        TransactionType.payment
      );
      if (eventTxs.length !== 1)
        throw new ImpossibleBehavior(
          `Received tx [${tx.txId}] for reward distribution of event [${tx.eventId}] but no payment tx found for the event in database`
        );
      const paymentTxId = eventTxs[0].txId;
      expectedOrder = await EventOrder.createEventRewardOrder(
        event,
        feeConfig,
        paymentTxId,
        eventWIDs
      );
    }
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
   * - tx order is to cold storage address
   * - at least one asset requires transfer
   * - no forbidden asset is transferred
   * - no active cold storage tx exist that is transferring the same token
   * - transferring assets remain more than low threshold in the lock address
   * @param tx the created payment transaction
   * @returns true if conditions are met
   */
  static verifyColdStorageTransaction = async (
    tx: PaymentTransaction
  ): Promise<boolean> => {
    const chainHandler = ChainHandler.getInstance();
    const chain = chainHandler.getChain(tx.network);

    // verify target address
    const txOrder = chain.extractTransactionOrder(tx);
    const coldAddress = chain.getChainConfigs().addresses.cold;
    if (txOrder.length !== 1 || txOrder[0].address !== coldAddress) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Tx extracted order is not verified`
      );
      return false;
    }

    // verify transferring assets
    const forbiddenTokens =
      await DatabaseHandler.getWaitingEventsRequiredTokens();
    if (
      txOrder[0].assets.tokens.some((token) =>
        forbiddenTokens.includes(token.id)
      )
    ) {
      logger.debug(
        `Transaction [${
          tx.txId
        }] is invalid: Tx is transferring forbidden token. Forbidden tokens: ${JsonBI.stringify(
          forbiddenTokens
        )}`
      );
      return false;
    }
    const nativeTokenId = ChainNativeToken[tx.network];
    const isNativeTokenForbade = forbiddenTokens.includes(nativeTokenId);

    // no active cold storage tx exist that is transferring the same token
    const thresholdsConfig = Configs.thresholds()[tx.network];
    const transferringTokenIds = txOrder[0].assets.tokens.map(
      (token) => token.id
    );
    const inProgressColdStorageTxs =
      await DatabaseAction.getInstance().getActiveColdStorageTxsInChain(
        tx.network
      );
    for (const activeTx of inProgressColdStorageTxs) {
      if (activeTx.txId === tx.txId) continue;
      const activeTxOrder = chain.extractTransactionOrder(
        TransactionSerializer.fromJson(activeTx.txJson)
      );
      if (
        activeTxOrder[0].assets.tokens.some((token) =>
          transferringTokenIds.includes(token.id)
        )
      ) {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: Tx is transferring a token that is in transfer by tx [${activeTx.txId}]`
        );
        return false;
      }
      if (
        txOrder[0].assets.nativeToken > thresholdsConfig.maxNativeTransfer &&
        activeTxOrder[0].assets.nativeToken > thresholdsConfig.maxNativeTransfer
      ) {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: Tx is transferring native token while it is also in transfer by tx [${activeTx.txId}]`
        );
        return false;
      }
    }

    // verify address assets
    const lockedAssets = await chain.getLockAddressAssets();
    const remainingAssets = ChainUtils.subtractAssetBalance(
      lockedAssets,
      txOrder[0].assets
    );
    const thresholds = thresholdsConfig.tokens;

    // verify transfer conditions for tokens
    let isTransferRequired = false;
    for (const orderToken of txOrder[0].assets.tokens) {
      const tokenId = orderToken.id;
      const lockedBalance = lockedAssets.tokens.find(
        (token) => token.id === tokenId
      );
      if (lockedBalance === undefined) {
        throw new ImpossibleBehavior(
          `Tx [${tx.txId}] is transferring token [${tokenId}] which is not in the lock address`
        );
      }
      if (lockedBalance.value > thresholds[tokenId].high) {
        isTransferRequired = true;
        const remainingBalance = remainingAssets.tokens.find(
          (token) => token.id === tokenId
        );
        if (remainingBalance === undefined) {
          logger.debug(
            `Transaction [${tx.txId}] is invalid: Expected token [${tokenId}] remains in lock address but found none`
          );
          return false;
        } else {
          if (
            remainingBalance.value > thresholds[tokenId].high ||
            remainingBalance.value < thresholds[tokenId].low
          ) {
            logger.debug(
              `Transaction [${tx.txId}] is invalid: Token [${tokenId}] condition does not satisfy. Expected: [${thresholds[tokenId].high} > ${remainingBalance.value} > ${thresholds[tokenId].low}]`
            );
            return false;
          }
        }
      } else {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: Transferring unexpected token [${tokenId}]`
        );
        return false;
      }
    }

    // verify transfer conditions for native token
    if (
      isNativeTokenForbade === false &&
      lockedAssets.nativeToken > thresholds[nativeTokenId].high
    ) {
      if (
        remainingAssets.nativeToken > thresholds[nativeTokenId].high ||
        remainingAssets.nativeToken < thresholds[nativeTokenId].low
      ) {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: Native token condition does not satisfy. Expected: [${thresholds[nativeTokenId].high} > ${remainingAssets.nativeToken} > ${thresholds[nativeTokenId].low}]`
        );
        return false;
      }
    } else {
      if (isTransferRequired === false) {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: No token nor native token require transfer`
        );
        return false;
      }
      if (txOrder[0].assets.nativeToken > thresholdsConfig.maxNativeTransfer) {
        logger.debug(
          `Transaction [${tx.txId}] is invalid: Transferring unexpected amount of native token [${txOrder[0].assets.nativeToken} > ${thresholdsConfig.maxNativeTransfer}]`
        );
        return false;
      }
    }

    return true;
  };

  /**
   * verifies the transaction
   * conditions:
   * - tx order is equal to the arbitrary order
   * @param tx the created payment transaction
   * @param orderJson encoded order
   * @returns true if conditions are met
   */
  static verifyArbitraryTransaction = async (
    tx: PaymentTransaction,
    orderJson: string
  ): Promise<boolean> => {
    const chain = ChainHandler.getInstance().getChain(tx.network);

    // verify tx order
    const expectedOrder = ChainUtils.decodeOrder(orderJson);
    const txOrder = ChainUtils.decodeOrder(
      ChainUtils.encodeOrder(chain.extractTransactionOrder(tx))
    );
    if (!isEqual(txOrder, expectedOrder)) {
      logger.debug(
        `Transaction [${tx.txId}] is invalid: Tx extracted order is not verified`
      );
      return false;
    }

    return true;
  };
}

export default TransactionVerifier;
