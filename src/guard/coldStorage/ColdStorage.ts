import { logger } from '../../log/Logger';
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

class ColdStorage {
  /**
   * sends any assets in Ergo lock address that its amount is more than its high threshold to cold storage
   */
  static processErgoStorageAssets = async (): Promise<void> => {
    try {
      logger.info('Processing assets in Ergo lock address');
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
      logger.warn(
        `An error occurred while processing assets in Ergo lock address [${ErgoConfigs.ergoContractConfig.lockAddress}]: ${e}`
      );
    }
  };

  /**
   * sends any assets in Cardano lock address that its amount is more than its high threshold to cold storage
   */
  static processCardanoStorageAssets = async (): Promise<void> => {
    try {
      logger.info('Processing assets in Cardano lock address');
      const assets = (
        await KoiosApi.getAddressAssets(CardanoConfigs.bankAddress)
      ).assets;
      const lockLovelace = (
        await KoiosApi.getAddressInfo(CardanoConfigs.bankAddress)
      ).balance;
      const cardanoAssets = Configs.thresholds()[ChainsConstants.cardano];

      let lovelace = 0n;
      const transferringTokens: AssetMap = {};
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
              transferringTokens[fingerprint] =
                assetQuantity - cardanoAssets[fingerprint].low;
            }
          }
        }
      });

      if (Object.keys(transferringTokens).length > 0 || lovelace > 0) {
        const transferringAssets: BoxesAssets = {
          ergs: lovelace,
          tokens: transferringTokens,
        };

        const tx = await CardanoColdStorage.generateTransaction(
          transferringAssets
        );
        txAgreement.startAgreementProcess(tx);
      }
    } catch (e) {
      logger.warn(
        `An error occurred while processing assets in Cardano lock address [${CardanoConfigs.bankAddress}]: ${e}`
      );
    }
  };
}

export default ColdStorage;
