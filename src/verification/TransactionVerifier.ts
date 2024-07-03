import {
  ChainUtils,
  EventTrigger,
  ImpossibleBehavior,
  PaymentOrder,
  PaymentTransaction,
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
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

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
   * - address remaining assets are more than low threshold
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

    // verify address assets
    const lockedAssets = await chain.getLockAddressAssets();
    const remainingAssets = ChainUtils.subtractAssetBalance(
      lockedAssets,
      txOrder[0].assets
    );
    const thresholds = Configs.thresholds()[tx.network];

    let isTransferValid = true;
    Object.keys(thresholds).forEach((tokenId) => {
      if (forbiddenTokens.includes(tokenId)) return;
      const isNativeToken =
        Configs.tokenMap.search(tx.network, {
          [Configs.tokenMap.getIdKey(tx.network)]: tokenId,
        })[0][tx.network].metaData.type === 'native';
      if (isNativeToken) {
        if (
          remainingAssets.nativeToken > thresholds[tokenId].high ||
          remainingAssets.nativeToken < thresholds[tokenId].low
        ) {
          logger.debug(
            `Transaction [${tx.txId}] is invalid: Native token [${tokenId}] condition does not satisfy. Expected: [${thresholds[tokenId].high} > ${remainingAssets.nativeToken} > ${thresholds[tokenId].low}]`
          );
          isTransferValid = false;
        }
      } else {
        const tokenBalance = remainingAssets.tokens.find(
          (token) => token.id === tokenId
        );
        if (tokenBalance === undefined) {
          logger.debug(
            `Transaction [${tx.txId}] is invalid: Expected token [${tokenId}] remains in lock address but found none`
          );
          isTransferValid = false;
        } else {
          if (
            tokenBalance.value > thresholds[tokenId].high ||
            tokenBalance.value < thresholds[tokenId].low
          ) {
            logger.debug(
              `Transaction [${tx.txId}] is invalid: Token [${tokenId}] condition does not satisfy. Expected: [${thresholds[tokenId].high} > ${tokenBalance.value} > ${thresholds[tokenId].low}]`
            );
            isTransferValid = false;
          }
        }
      }
    });

    return isTransferValid;
  };
}

export default TransactionVerifier;
