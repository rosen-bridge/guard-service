import { loggerFactory } from '../log/Logger';
import Configs from '../configs/Configs';
import { Buffer } from 'buffer';
import Utils from '../utils/Utils';
import { dbAction } from '../db/DatabaseAction';
import { TransactionStatus } from '../utils/constants';
import TxAgreement from '../agreement/TxAgreement';
import { ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import ChainHandler from '../handlers/ChainHandler';
import {
  AbstractChain,
  AssetBalance,
  PaymentOrder,
  TokenInfo,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import TransactionSerializer from '../transaction/TransactionSerializer';
import { rosenConfig } from '../configs/RosenConfig';

const logger = loggerFactory(import.meta.url);

class ColdStorage {
  static chains = [ERGO_CHAIN, CARDANO_CHAIN];

  /**
   * runs cold storage process for all chains
   */
  static processLockAddressAssets = async (): Promise<void> => {
    await Promise.all(
      this.chains.map((chain) => this.chainColdStorageProcess(chain))
    );
  };

  /**
   * process locked assets in a chain and generates a transaction if any assets is more than its high thresholds
   * @param chainName
   * @returns
   */
  static chainColdStorageProcess = async (chainName: string): Promise<void> => {
    try {
      logger.info(`Processing assets in [${chainName}] lock address`);
      const inProgressColdStorageTxs = (
        await dbAction.getNonCompleteColdStorageTxsInChain(chainName)
      ).filter((tx) => tx.status !== TransactionStatus.invalid);
      if (inProgressColdStorageTxs.length !== 0) {
        logger.info(
          `There is already an active cold storage transaction for chain [${chainName}]`
        );
        return;
      }

      const chain = ChainHandler.getInstance().getChain(chainName);
      const lockedAssets = await chain.getLockAddressAssets();
      const thresholds = Configs.thresholds()[chainName];

      let transferringNativeToken = 0n;
      const transferringTokens: TokenInfo[] = [];
      Object.keys(thresholds).forEach((tokenId) => {
        const isNativeToken =
          Configs.tokenMap.search(chainName, {
            [Configs.tokenMap.getIdKey(chainName)]: tokenId,
          })[0][chainName].metaData.type === 'native';
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
   * generates a transaction to transfer some asssets to cold storage
   * @param assets transferring assets
   * @param chain chain object
   * @param chainName
   */
  static generateColdStorageTransaction = async (
    assets: AssetBalance,
    chain: AbstractChain,
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
        address: ChainHandler.getInstance().getChainColdAddress(chainName),
        assets: assets,
      },
    ];

    // get unsigned transactions in target chain
    const unsignedAgreementTransactions = (
      await TxAgreement.getInstance()
    ).getChainPendingTransactions(chainName);
    const unsignedQueueTransactions = (
      await dbAction.getUnsignedActiveTxsInChain(chainName)
    ).map((txEntity) => TransactionSerializer.fromJson(txEntity.txJson));
    // get signed transactions in target chain
    const signedTransactions = (
      await dbAction.getSignedActiveTxsInChain(chainName)
    ).map((txEntity) =>
      Buffer.from(
        TransactionSerializer.fromJson(txEntity.txJson).txBytes
      ).toString('hex')
    );

    // generate transaction
    const tx = await chain.generateTransaction(
      '',
      TransactionTypes.coldStorage,
      order,
      [...unsignedAgreementTransactions, ...unsignedQueueTransactions],
      signedTransactions,
      ...extra
    );
    (await TxAgreement.getInstance()).addTransactionToQueue(tx);
  };
}

export default ColdStorage;
