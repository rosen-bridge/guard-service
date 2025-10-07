import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

import {
  AssetBalance,
  ChainUtils,
  TokenInfo,
} from '@rosen-chains/abstract-chain';

import {
  CardanoUtxo,
  CardanoBoxCandidate,
  CardanoAsset,
  CardanoTxInput,
} from './types';

class CardanoUtils {
  /**
   * generates asset id from policyId and assetName
   * @param asset
   * @returns
   */
  static generateAssetId = (policyId: string, assetName: string) =>
    `${policyId}.${assetName}`;

  /**
   * generates asset id from CardanoAsset object
   * @param asset
   * @returns
   */
  static getAssetId = (asset: CardanoAsset) =>
    this.generateAssetId(asset.policyId, asset.assetName);

  /**
   * calculates total amount of lovelace and assets in list of CardanoUtxo
   * @param utxos
   */
  static calculateUtxoAssets = (utxos: CardanoUtxo[]): AssetBalance => {
    return utxos
      .map(
        (utxo): AssetBalance => ({
          nativeToken: utxo.value,
          tokens: utxo.assets.map(
            (asset): TokenInfo => ({
              id: this.getAssetId(asset),
              value: asset.quantity,
            }),
          ),
        }),
      )
      .reduce(ChainUtils.sumAssetBalance, {
        nativeToken: 0n,
        tokens: [],
      });
  };

  /**
   * gets Cardano box assets
   * @param box the Cardano box
   */
  static getBoxAssets = (box: CardanoWasm.TransactionOutput): AssetBalance => {
    const tokens: Array<TokenInfo> = [];
    const boxValue = box.amount();
    const boxAssets = boxValue.multiasset();
    if (boxAssets) {
      for (let i = 0; i < boxAssets.keys().len(); i++) {
        const scriptHash = boxAssets.keys().get(i);
        const asset = boxAssets.get(scriptHash)!;
        for (let j = 0; j < asset.keys().len(); j++) {
          const assetName = asset.keys().get(j);
          const assetAmount = asset.get(assetName)!;
          tokens.push({
            id: this.generateAssetId(
              scriptHash.to_hex(),
              this.assetNameToHex(assetName),
            ),
            value: BigInt(assetAmount.to_str()),
          });
        }
      }
    }
    return {
      nativeToken: BigInt(boxValue.coin().to_str()),
      tokens: tokens,
    };
  };

  /**
   * converts bigint to BigNum
   * @param value bigint value
   */
  static bigIntToBigNum = (value: bigint): CardanoWasm.BigNum => {
    return CardanoWasm.BigNum.from_str(value.toString());
  };

  /**
   * gets assetName hex from CardanoWasm.AssetName object
   * @param assetName
   * @returns
   */
  static assetNameToHex = (assetName: CardanoWasm.AssetName): string =>
    Buffer.from(assetName.name()).toString('hex');

  /**
   * get box id from CardanoWasm.TransactionInput, CardanoTxInput or CardanoUtxo
   * @param box to fetch d
   * @returns tx_hash.index as box id
   */
  static getBoxId = (
    box: CardanoUtxo | CardanoTxInput | CardanoWasm.TransactionInput,
  ): string => {
    if (box instanceof CardanoWasm.TransactionInput) {
      const boxJS = box.to_js_value();
      return boxJS.transaction_id + '.' + boxJS.index;
    }
    return box.txId + '.' + box.index;
  };

  /**
   * converts a CardanoBoxCandidate to CardanoUtxo
   * @param candidate CardanoBoxCandidate object
   * @param txId transaction id
   * @param index box index in transaction outputs list
   */
  static convertCandidateToUtxo = (
    candidate: CardanoBoxCandidate,
    txId: string,
    index: number,
  ): CardanoUtxo => ({
    txId: txId,
    index: index,
    value: candidate.value,
    assets: structuredClone(candidate.assets),
  });

  /**
   * creates a box candidate by assets and address
   * @param assets
   * @param address
   * @returns
   */
  static createTransactionOutput = (
    assets: AssetBalance,
    address: string,
  ): CardanoWasm.TransactionOutput => {
    const changeBoxMultiAsset = CardanoWasm.MultiAsset.new();
    assets.tokens.forEach((asset) => {
      const assetInfo = asset.id.split('.');
      const policyId: CardanoWasm.ScriptHash = CardanoWasm.ScriptHash.from_hex(
        assetInfo[0],
      );
      const assetName: CardanoWasm.AssetName = CardanoWasm.AssetName.new(
        Buffer.from(assetInfo[1], 'hex'),
      );
      changeBoxMultiAsset.set_asset(
        policyId,
        assetName,
        CardanoUtils.bigIntToBigNum(asset.value),
      );
    });

    const changeAmount: CardanoWasm.Value = CardanoWasm.Value.new(
      CardanoWasm.BigNum.from_str(assets.nativeToken.toString()),
    );
    changeAmount.set_multiasset(changeBoxMultiAsset);
    return CardanoWasm.TransactionOutput.new(
      CardanoWasm.Address.from_bech32(address),
      changeAmount,
    );
  };
}

export default CardanoUtils;
