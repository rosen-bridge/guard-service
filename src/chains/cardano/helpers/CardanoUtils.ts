import {
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

class CardanoUtils {
  /**
   * reads asset unit from assets fingerprint unit map in config file, throws error if fingerprint not found
   * @param fingerprint asset fingerprint
   */
  static getAssetPolicyAndNameFromConfigFingerPrintMap = (
    fingerprint: string
  ): [Uint8Array, Uint8Array] => {
    const token = Configs.tokenMap.search(ChainsConstants.cardano, {
      [Configs.tokenMap.getIdKey(ChainsConstants.cardano)]: fingerprint,
    });
    if (token.length === 0)
      throw new Error(`Asset fingerprint [${fingerprint}] not found in config`);
    return [
      Buffer.from(token[0][ChainsConstants.cardano]['policyId'], 'hex'),
      Buffer.from(token[0][ChainsConstants.cardano]['assetName'], 'hex'),
    ];
  };

  /**
   * returns rosenData object if the box format is like rosen bridge observations otherwise returns undefined
   * @param metaData
   */
  static getRosenData = (metaData: MetaData): RosenData | undefined => {
    // Rosen data type exists with the '0' key on the cardano tx metadata
    if (Object.prototype.hasOwnProperty.call(metaData, '0')) {
      const data = metaData['0'];
      if (
        'to' in data &&
        'bridgeFee' in data &&
        'networkFee' in data &&
        'toAddress' in data
      ) {
        const rosenData = data as unknown as {
          to: string;
          bridgeFee: string;
          networkFee: string;
          toAddress: string;
        };
        return {
          toChain: rosenData.to,
          bridgeFee: rosenData.bridgeFee,
          networkFee: rosenData.networkFee,
          toAddress: rosenData.toAddress,
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
          assetList.insert(
            assetName,
            BigNum.from_str(boxAsset.quantity.toString())
          );
          multiAsset.insert(policyId, assetList);
        } else {
          const asset = policyAssets.get(assetName);
          if (!asset) {
            policyAssets.insert(
              assetName,
              BigNum.from_str(boxAsset.quantity.toString())
            );
            multiAsset.insert(policyId, policyAssets);
          } else {
            const amount = asset.checked_add(
              BigNum.from_str(boxAsset.quantity.toString())
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
}

export default CardanoUtils;
