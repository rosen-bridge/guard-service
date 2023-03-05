import { loggerFactory } from '../../log/Logger';
import ExplorerApi from '../../chains/ergo/network/ExplorerApi';
import ErgoConfigs from '../../chains/ergo/helpers/ErgoConfigs';
import Configs from '../../helpers/Configs';
import ChainsConstants from '../../chains/ChainsConstants';
import { AssetMap, BoxesAssets } from '../../chains/ergo/models/Interfaces';
import ErgoColdStorage from '../../chains/ergo/ErgoColdStorage';
import { txAgreement } from '../agreement/TxAgreement';
import KoiosApi from '../../chains/cardano/network/KoiosApi';
import CardanoConfigs from '../../chains/cardano/helpers/CardanoConfigs';
import CardanoColdStorage from '../../chains/cardano/CardanoColdStorage';
import {
  AssetName,
  Assets,
  BigNum,
  MultiAsset,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { Buffer } from 'buffer';
import CardanoUtils from '../../chains/cardano/helpers/CardanoUtils';
import Utils from '../../helpers/Utils';
import {
  FailedError,
  NetworkError,
  UnexpectedApiError,
} from '../../helpers/errors';
import { UtxoBoxesAssets } from '../../chains/cardano/models/Interfaces';
import { dbAction } from '../../db/DatabaseAction';
import { TransactionStatus } from '../../models/Models';
import { ImpossibleBehavior } from '../../helpers/errors';
import { TypeORMError } from 'typeorm';

const logger = loggerFactory(import.meta.url);

class ColdStorage {
  /**
   * runs cold storage process for all chains
   */
  static processLockAddressAssets = async (): Promise<void> => {
    await this.processErgoStorageAssets();
    await this.processCardanoStorageAssets();
  };

  /**
   * sends any assets in Ergo lock address that its amount is more than its high threshold to cold storage
   */
  static processErgoStorageAssets = async (): Promise<void> => {
    try {
      logger.info('Processing assets in Ergo lock address');
      const inProgressColdStorageTxs = (
        await dbAction.getNonCompleteColdStorageTxsInChain(ChainsConstants.ergo)
      ).filter((tx) => tx.status != TransactionStatus.invalid);
      if (inProgressColdStorageTxs.length !== 0) {
        logger.info(
          'There is already an active cold storage transaction for Ergo chain'
        );
        return;
      }

      const assets = await ExplorerApi.getAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress
      );
      const ergoAssets = Configs.thresholds()[ChainsConstants.ergo];

      let ergs = 0n;
      const transferringTokens: AssetMap = {};
      Object.keys(ergoAssets).forEach((tokenId) => {
        if (tokenId === ChainsConstants.ergoNativeAsset) {
          if (
            assets.nanoErgs > ergoAssets[ChainsConstants.ergoNativeAsset].high
          ) {
            ergs =
              assets.nanoErgs - ergoAssets[ChainsConstants.ergoNativeAsset].low;
          }
        } else {
          const tokenBalance = assets.tokens.find(
            (token) => token.tokenId === tokenId
          );
          if (tokenBalance === undefined)
            logger.warn(
              `Expected token [${tokenId}] exist in lock address but found none`
            );
          else {
            if (tokenBalance.amount > ergoAssets[tokenId].high) {
              transferringTokens[tokenId] =
                tokenBalance.amount - ergoAssets[tokenId].low;
            }
          }
        }
      });

      if (Object.keys(transferringTokens).length > 0 || ergs > 0) {
        const transferringAssets: BoxesAssets = {
          ergs: ergs,
          tokens: transferringTokens,
        };

        const tx = await ErgoColdStorage.generateTransaction(
          transferringAssets
        );
        txAgreement.startAgreementProcess(tx);
      }
    } catch (e) {
      if (e instanceof TypeORMError) {
        logger.warn(
          `An error occurred while getting incomplete cold storage txs: ${e}`
        );
        logger.warn(e.stack);
      } else if (
        e instanceof FailedError ||
        e instanceof NetworkError ||
        e instanceof UnexpectedApiError
      ) {
        logger.warn(
          `An error occurred while getting Ergo address assets: ${e}`
        );
        logger.warn(e.stack);
      } else {
        logger.warn(
          `An unexpected error occurred while processing assets in Ergo lock address [${ErgoConfigs.ergoContractConfig.lockAddress}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
  };

  /**
   * sends any assets in Cardano lock address that its amount is more than its high threshold to cold storage
   */
  static processCardanoStorageAssets = async (): Promise<void> => {
    try {
      logger.info('Processing assets in Cardano lock address');
      const inProgressColdStorageTxs = (
        await dbAction.getNonCompleteColdStorageTxsInChain(
          ChainsConstants.cardano
        )
      ).filter((tx) => tx.status != TransactionStatus.invalid);
      if (inProgressColdStorageTxs.length !== 0) {
        logger.info(
          'There is already an active cold storage transaction for Cardano chain'
        );
        return;
      }

      const assets = (
        await KoiosApi.getAddressAssets(CardanoConfigs.lockAddress)
      ).asset_list;
      const lockLovelace = BigInt(
        (await KoiosApi.getAddressInfo(CardanoConfigs.lockAddress)).balance
      );
      const cardanoAssets = Configs.thresholds()[ChainsConstants.cardano];

      let lovelace = 0n;
      const transferringTokens = MultiAsset.new();
      Object.keys(cardanoAssets).forEach((fingerprint) => {
        if (fingerprint === ChainsConstants.cardanoNativeAsset) {
          if (
            lockLovelace >
            cardanoAssets[ChainsConstants.cardanoNativeAsset].high
          ) {
            lovelace =
              lockLovelace -
              cardanoAssets[ChainsConstants.cardanoNativeAsset].low;
          }
        } else {
          const assetBalance = assets.find(
            (asset) => asset.fingerprint === fingerprint
          );
          if (assetBalance === undefined)
            logger.warn(
              `Expected asset [${fingerprint}] exist in lock address but found none`
            );
          else {
            const assetQuantity = BigInt(assetBalance.quantity);
            if (assetQuantity > cardanoAssets[fingerprint].high) {
              // insert into multiAsset
              const token = CardanoUtils.getCardanoAssetInfo(fingerprint);
              const policyId = ScriptHash.from_bytes(
                Buffer.from(Utils.Uint8ArrayToHexString(token.policyId), 'hex')
              );
              const assetName = AssetName.new(
                Buffer.from(Utils.Uint8ArrayToHexString(token.assetName), 'hex')
              );

              const policyAssets = transferringTokens.get(policyId);
              if (!policyAssets) {
                const assetList = Assets.new();
                assetList.insert(
                  assetName,
                  BigNum.from_str(
                    (assetQuantity - cardanoAssets[fingerprint].low).toString()
                  )
                );
                transferringTokens.insert(policyId, assetList);
              } else {
                const asset = policyAssets.get(assetName);
                if (!asset) {
                  policyAssets.insert(
                    assetName,
                    BigNum.from_str(
                      (
                        assetQuantity - cardanoAssets[fingerprint].low
                      ).toString()
                    )
                  );
                  transferringTokens.insert(policyId, policyAssets);
                } else {
                  throw new ImpossibleBehavior(
                    `Duplicate thresholds found for fingerprint [${fingerprint}]`
                  );
                }
              }
            }
          }
        }
      });

      if (transferringTokens.len() > 0 || lovelace > 0) {
        const transferringAssets: UtxoBoxesAssets = {
          lovelace: BigNum.from_str(lovelace.toString()),
          assets: transferringTokens,
        };

        const tx = await CardanoColdStorage.generateTransaction(
          transferringAssets
        );
        txAgreement.startAgreementProcess(tx);
      }
    } catch (e) {
      logger.warn(
        `An error occurred while processing assets in Cardano lock address [${CardanoConfigs.lockAddress}]: ${e}`
      );
      logger.warn(e.stack);
    }
  };
}

export default ColdStorage;
