import {
  Asset,
  AssetInfo,
  InputUtxo,
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
  Transaction,
  TransactionOutput,
} from '@emurgo/cardano-serialization-lib-nodejs';
import { Buffer } from 'buffer';
import { ImpossibleBehavior } from '../../../helpers/errors';
import CardanoTransaction from '../models/CardanoTransaction';

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
   * creates an Utxo object from TransactionOutput object
   * @param txId
   * @param index
   * @param box
   */
  static transactionOutputToUtxo = (
    txId: string,
    index: number,
    box: TransactionOutput
  ): Utxo => {
    const assets: Asset[] = [];
    const multiAsset = box.amount().multiasset();
    if (multiAsset) {
      for (let i = 0; i < multiAsset.len(); i++) {
        const policyId = multiAsset.keys().get(i);
        const policyAssets = multiAsset.get(policyId);

        if (!policyAssets)
          throw new ImpossibleBehavior(
            'MultiAsset contains policyId with no assetName'
          );

        for (let j = 0; j < policyAssets.len(); j++) {
          const assetName = policyAssets.keys().get(j);
          const assetAmount = policyAssets.get(assetName);

          if (!assetAmount)
            throw new ImpossibleBehavior(
              'MultiAsset contains assetName with no amount'
            );

          assets.push({
            policy_id: policyId.to_hex(),
            asset_name: assetName.to_js_value(),
            quantity: assetAmount.to_str(),
            fingerprint: '', // TODO: need to create fingerprint from policyId and assetName (#119)
          });
        }
      }
    }

    return {
      payment_addr: {
        bech32: box.address().to_bech32(),
      },
      tx_hash: txId,
      tx_index: index,
      value: box.amount().coin().to_str(),
      asset_list: assets,
    };
  };

  /**
   * returns list of the input box ids in the transaction
   * @param tx the payment transaction (CardanoTransaction)
   */
  static getPaymentTxInputIds = (tx: CardanoTransaction): InputUtxo[] => {
    const txInputs = Transaction.from_bytes(tx.txBytes).body().inputs();
    const ids: InputUtxo[] = [];
    for (let i = 0; i < txInputs.len(); i++) {
      const input = txInputs.get(i);
      ids.push({
        txHash: input.transaction_id().to_hex(),
        txIndex: input.index(),
      });
    }
    return ids;
  };

  /**
   * creates a map from MultiAsset object
   *  map key is object of the asset policyId and name
   *  value is amount of the asset
   * @param multiAsset
   */
  static multiAssetToAssetMap = (
    multiAsset: MultiAsset
  ): Map<AssetInfo, BigNum> => {
    const output = new Map<AssetInfo, BigNum>();

    for (let i = 0; i < multiAsset.keys().len(); i++) {
      const policyId = multiAsset.keys().get(i);
      const assets = multiAsset.get(policyId)!;
      for (let j = 0; j < assets.keys().len(); j++) {
        const assetName = assets.keys().get(j);
        const assetAmount = assets.get(assetName)!;
        const assetInfo: AssetInfo = {
          assetName: assetName.name(),
          policyId: policyId.to_bytes(),
        };
        const assetRecord = output.get(assetInfo);
        if (assetRecord === undefined) {
          output.set(assetInfo, assetAmount);
        } else {
          throw new ImpossibleBehavior(
            'MultiAsset contains multiple record for single policyId and assetName'
          );
        }
      }
    }

    return output;
  };
}

export default CardanoUtils;
