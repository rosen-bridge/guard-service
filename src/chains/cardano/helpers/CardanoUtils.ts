import {
  AssetInfo,
  MetaData,
  RosenData,
  Utxo,
  UtxoBoxesAssets,
} from '../models/Interfaces';
import Configs from '../../../helpers/Configs';
import ChainsConstants from '../../ChainsConstants';
import {
  AssetName,
  Assets,
  BigNum,
  MultiAsset,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { Buffer } from 'buffer';
import CardanoConfigs from "./CardanoConfigs";
import Utils from "../../../helpers/Utils";
import {NotEnoughAssetsError} from "../../../helpers/errors";

class CardanoUtils {
  /**
   * returns asset policy id and asset name from tokenMap, throws error if fingerprint not found
   * @param fingerprint asset fingerprint
   */
  static getCardanoAssetInfo = (fingerprint: string): AssetInfo => {
    const token = Configs.tokenMap.search(ChainsConstants.cardano, {
      [Configs.tokenMap.getIdKey(ChainsConstants.cardano)]: fingerprint,
    });
    if (token.length === 0)
      throw new Error(`Asset fingerprint [${fingerprint}] not found in config`);
    return {
      fingerprint: fingerprint,
      policyId: Buffer.from(
        token[0][ChainsConstants.cardano]['policyId'],
        'hex'
      ),
      assetName: Buffer.from(
        token[0][ChainsConstants.cardano]['assetName'],
        'hex'
      ),
    };
  };

  /**
   * returns rosenData object if the box format is like rosen bridge observations otherwise returns undefined
   * @param metaData
   */
  static getRosenData = (metaData: MetaData): RosenData | undefined => {
    // Rosen data type exists with the '0' key on the cardano tx metadata
    if (metaData && Object.prototype.hasOwnProperty.call(metaData, '0')) {
      const data = metaData['0'];
      if (
        'to' in data &&
        'bridgeFee' in data &&
        'networkFee' in data &&
        'toAddress' in data &&
        'fromAddress' in data
      ) {
        const rosenData = data as unknown as {
          to: string;
          bridgeFee: string;
          networkFee: string;
          toAddress: string;
          fromAddress: string[];
        };
        return {
          toChain: rosenData.to,
          bridgeFee: rosenData.bridgeFee,
          networkFee: rosenData.networkFee,
          toAddress: rosenData.toAddress,
          fromAddress: rosenData.fromAddress.join(''),
        };
      }
    }
    return undefined;
  };

  /**
   * calculates amount of lovelace and assets in utxo boxes
   * @param boxes the utxogenerateTransaction boxes
   */
  static calculateInputBoxesAssets = (boxes: Utxo[]): UtxoBoxesAssets => {
    const multiAsset = MultiAsset.new();
    let changeBoxLovelace: BigNum = BigNum.zero();
    boxes.forEach((box) => {
      changeBoxLovelace = changeBoxLovelace.checked_add(
        BigNum.from_str(box.value)
      );

      box.asset_list.forEach((boxAsset) => {
        const policyId = ScriptHash.from_bytes(
          Buffer.from(boxAsset.policy_id, 'hex')
        );
        const assetName = AssetName.new(
          Buffer.from(boxAsset.asset_name, 'hex')
        );

        const policyAssets = multiAsset.get(policyId);
        if (!policyAssets) {
          const assetList = Assets.new();
          assetList.insert(assetName, BigNum.from_str(boxAsset.quantity));
          multiAsset.insert(policyId, assetList);
        } else {
          const asset = policyAssets.get(assetName);
          if (!asset) {
            policyAssets.insert(assetName, BigNum.from_str(boxAsset.quantity));
            multiAsset.insert(policyId, policyAssets);
          } else {
            const amount = asset.checked_add(
              BigNum.from_str(boxAsset.quantity)
            );
            policyAssets.insert(assetName, amount);
            multiAsset.insert(policyId, policyAssets);
          }
        }
      });
    });
    return {
      lovelace: changeBoxLovelace,
      assets: multiAsset,
    };
  };


  /**
   * getting all address utxos and return minimum amount of required box to be in the input of transaction
   * @param addressBoxes all utxos of bankAddress
   * @param requiredAssets required assets to be in the input of transaction
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return minimum required box to be in the input of the transaction
   */
  static getCoveringUtxo = (
      addressBoxes: Array<Utxo>,
      requiredAssets: UtxoBoxesAssets
  ): Array<Utxo> => {
    const result: Array<Utxo> = [];
    let coveredLovelace = BigNum.from_str('0');
    const shuffleIndexes = [...Array(addressBoxes.length).keys()];
    for (let i = shuffleIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleIndexes[i], shuffleIndexes[j]] = [
        shuffleIndexes[j],
        shuffleIndexes[i],
      ];
    }

    if (requiredAssets.assets.len() === 0) {
      const paymentAmount = requiredAssets.lovelace;
      for (
          let i = 0;
          paymentAmount.compare(coveredLovelace) > 0 && i < addressBoxes.length;
          i++
      ) {
        const uTxo = addressBoxes[shuffleIndexes[i]];
        coveredLovelace = coveredLovelace.checked_add(
            BigNum.from_str(uTxo.value)
        );
        result.push(uTxo);
      }
      if (paymentAmount.compare(coveredLovelace) > 0)
        throw new Error(
            `An error occurred, theres is no enough lovelace in the bank`
        );
    } else {
      const lovelacePaymentAmount =
          requiredAssets.lovelace > BigNum.zero()
              ? requiredAssets.lovelace
              : CardanoConfigs.txMinimumLovelace;
      const requiredMultiAssets = requiredAssets.assets;
      const requiredAssetsMap = new Map<AssetInfo, BigNum>();

      for (let i = 0; i < requiredMultiAssets.keys().len(); i++) {
        const policyId = requiredMultiAssets.keys().get(i);
        const assets = requiredMultiAssets.get(policyId)!;
        for (let j = 0; j < assets.keys().len(); j++) {
          const assetName = assets.keys().get(j);
          const assetAmount = assets.get(assetName)!;
          const assetInfo: AssetInfo = {
            assetName: assetName.name(),
            policyId: policyId.to_bytes(),
            fingerprint: '',
          };
          if (requiredAssetsMap.get(assetInfo) === undefined) {
            requiredAssetsMap.set(assetInfo, assetAmount);
          } else {
            requiredAssetsMap.set(
                assetInfo,
                requiredAssetsMap.get(assetInfo)!.checked_add(assetAmount)
            );
          }
        }
      }

      for (
          let i = 0;
          (requiredAssetsMap.size > 0 ||
              lovelacePaymentAmount.compare(coveredLovelace) > 0) &&
          i < addressBoxes.length;
          i++
      ) {
        let isAdded = false;
        const uTxo = addressBoxes[shuffleIndexes[i]];
        if (requiredAssetsMap.size > 0) {
          for (const assetPair of requiredAssetsMap) {
            const assetIndex = uTxo.asset_list.findIndex(
                (asset) =>
                    asset.asset_name ===
                    Utils.Uint8ArrayToHexString(assetPair[0].assetName) &&
                    asset.policy_id ===
                    Utils.Uint8ArrayToHexString(assetPair[0].policyId)
            );
            if (assetIndex !== -1) {
              const asset = uTxo.asset_list[assetIndex];
              if (BigNum.from_str(asset.quantity).compare(assetPair[1]) >= 0) {
                requiredAssetsMap.delete(assetPair[0]);
              } else {
                requiredAssetsMap.set(
                    assetPair[0],
                    assetPair[1].checked_sub(BigNum.from_str(asset.quantity))
                );
              }
              coveredLovelace = coveredLovelace.checked_add(
                  BigNum.from_str(uTxo.value)
              );
              result.push(uTxo);
              isAdded = true;
            }
          }
        }
        if (!isAdded && lovelacePaymentAmount.compare(coveredLovelace) > 0) {
          coveredLovelace = coveredLovelace.checked_add(
              BigNum.from_str(uTxo.value)
          );
          result.push(uTxo);
        }
      }

      if (lovelacePaymentAmount.compare(coveredLovelace) > 0)
        throw new NotEnoughAssetsError(
            `Not enough lovelace in the bank. required: ${lovelacePaymentAmount.to_str()}, found ${coveredLovelace.to_str()}`
        );
      if (requiredAssetsMap.size > 0)
        throw new NotEnoughAssetsError(
            `Not enough asset in the bank. found ${JSON.stringify(
                result
            )} shortage ${JSON.stringify(Array.from(requiredAssetsMap))}`
        );
    }
    return result;
  };
}

export default CardanoUtils;
