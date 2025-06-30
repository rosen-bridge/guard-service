import Configs from '../configs/Configs';
import { Buffer } from 'buffer';
import Utils from '../utils/Utils';
import { SUPPORTED_CHAINS, TransactionStatus } from '../utils/constants';
import TxAgreement from '../agreement/TxAgreement';
import { ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import ChainHandler from '../handlers/ChainHandler';
import {
  AbstractChain,
  AssetBalance,
  PaymentOrder,
  TokenInfo,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import * as TransactionSerializer from '../transaction/TransactionSerializer';
import { rosenConfig } from '../configs/RosenConfig';
import { DatabaseAction } from '../db/DatabaseAction';
import GuardTurn from '../utils/GuardTurn';
import GuardPkHandler from '../handlers/GuardPkHandler';
import DatabaseHandler from '../db/DatabaseHandler';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { TokenHandler } from '../handlers/tokenHandler';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class ColdStorage {
  /**
   * runs cold storage process for all chains
   */
  static processLockAddressAssets = async (): Promise<void> => {
    await Promise.all(
      SUPPORTED_CHAINS.map((chain) => this.chainColdStorageProcess(chain))
    );
  };

  /**
   * process locked assets in a chain and generates a transaction if any assets is more than its high thresholds
   * @param chainName
   * @returns
   */
  static chainColdStorageProcess = async (chainName: string): Promise<void> => {
    if (GuardTurn.guardTurn() !== GuardPkHandler.getInstance().guardId) {
      logger.info(
        `Turn is over. Abort cold storage process on chain [${chainName}]`
      );
      return;
    }
    try {
      logger.info(`Processing assets in [${chainName}] lock address`);
      const inProgressColdStorageTxs =
        await DatabaseAction.getInstance().getActiveColdStorageTxsInChain(
          chainName
        );
      if (inProgressColdStorageTxs.length !== 0) {
        logger.info(
          `There is already an active cold storage transaction for chain [${chainName}]`
        );
        return;
      }

      const thresholds = Configs.thresholds()[chainName].tokens;
      if (Object.keys(thresholds).length === 0) {
        logger.info(
          `Abort cold storage process on chain [${chainName}] since no thresholds is set for it`
        );
        return;
      }

      const chain = ChainHandler.getInstance().getChain(chainName);
      const lockedAssets = await chain.getLockAddressAssets();

      let transferringNativeToken = 0n;
      const transferringTokens: TokenInfo[] = [];
      const forbiddenTokens =
        await DatabaseHandler.getWaitingEventsRequiredTokens();
      Object.keys(thresholds).forEach((tokenId) => {
        if (forbiddenTokens.includes(tokenId)) {
          logger.debug(
            `Skipped token [${tokenId}] in cold storage tx: token is required in some waiting events`
          );
          return;
        }
        const isNativeToken =
          TokenHandler.getInstance().getTokenMap().search(chainName, {
            tokenId,
          })[0][chainName].type === 'native';
        if (isNativeToken) {
          if (lockedAssets.nativeToken > thresholds[tokenId].high)
            transferringNativeToken =
              lockedAssets.nativeToken - thresholds[tokenId].low;
        } else {
          const tokenBalance = lockedAssets.tokens.find(
            (token) => token.id === tokenId
          );
          if (tokenBalance === undefined)
            logger.warn(
              `Expected token [${tokenId}] exist in lock address but found none`
            );
          else {
            if (tokenBalance.value > thresholds[tokenId].high)
              transferringTokens.push({
                id: tokenId,
                value: tokenBalance.value - thresholds[tokenId].low,
              });
          }
        }
      });

      // generate cold storage transaction if any asset should be transferred
      if (
        transferringNativeToken > 0 ||
        Object.keys(transferringTokens).length > 0
      ) {
        const transferringAssets: AssetBalance = {
          nativeToken: Utils.maxBigint(
            transferringNativeToken,
            chain.getMinimumNativeToken()
          ),
          tokens: transferringTokens,
        };
        await this.generateColdStorageTransaction(
          transferringAssets,
          chain,
          chainName
        );
      }
    } catch (e) {
      logger.warn(
        `An error occurred while processing locked assets in chain [${chainName}]: ${e}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * generates a transaction to transfer some assets to cold storage
   * @param assets transferring assets
   * @param chain chain object
   * @param chainName
   */
  static generateColdStorageTransaction = async (
    assets: AssetBalance,
    chain: AbstractChain<unknown>,
    chainName: string
  ): Promise<void> => {
    // get guardsConfigBox if chain is ergo
    const extra: any[] = [];
    if (chainName === ERGO_CHAIN) {
      const guardsConfigBox = await (chain as ErgoChain).getGuardsConfigBox(
        rosenConfig.guardNFT,
        rosenConfig.guardSignAddress
      );
      extra.push([], [guardsConfigBox]);
    }

    // generate order
    const order: PaymentOrder = [
      {
        address: chain.getChainConfigs().addresses.cold,
        assets: assets,
      },
    ];

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions = (
      await TxAgreement.getInstance()
    ).getChainPendingTransactions(chainName);
    const unsignedQueueTransactions = (
      await DatabaseAction.getInstance().getUnsignedActiveTxsInChain(chainName)
    ).map((txEntity) => TransactionSerializer.fromJson(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await DatabaseAction.getInstance().getSignedActiveTxsInChain(chainName)
    ).map((txEntity) =>
      Buffer.from(
        TransactionSerializer.fromJson(txEntity.txJson).txBytes
      ).toString('hex')
    );

    // generate transaction
    const txs = await chain.generateMultipleTransactions(
      '',
      TransactionType.coldStorage,
      order,
      [...unsignedAgreementTransactions, ...unsignedQueueTransactions],
      signedTransactions,
      ...extra
    );
    if (GuardTurn.guardTurn() === GuardPkHandler.getInstance().guardId) {
      const txAgreement = await TxAgreement.getInstance();
      for (const tx of txs) {
        txAgreement.addTransactionToQueue(tx);
      }
    } else {
      logger.info(
        `Cold storage txs [${txs
          .map((tx) => tx.txId)
          .join(
            ','
          )}] on chain [${chainName}] are generated but turn is over. No tx will be added to Agreement queue`
      );
    }
  };
}

export default ColdStorage;
