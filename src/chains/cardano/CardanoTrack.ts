import { InputUtxo, Utxo, UtxoBoxesAssets } from './models/Interfaces';
import KoiosApi from './network/KoiosApi';
import CardanoConfigs from './helpers/CardanoConfigs';
import { BigNum, Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import {
  ImpossibleBehavior,
  NotEnoughValidBoxesError,
} from '../../helpers/errors';
import { dbAction } from '../../db/DatabaseAction';
import ChainsConstants from '../ChainsConstants';
import { txAgreement } from '../../guard/agreement/TxAgreement';
import CardanoTransaction from './models/CardanoTransaction';
import CardanoUtils from './helpers/CardanoUtils';
import Utils from '../../helpers/Utils';

// TODO: include this class in refactor (#109)
class CardanoTrack {
  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  static deserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.from_bytes(txBytes);
  };

  /**
   * generates tx input dictionary from tx-queue Cardano transactions to track boxes and append to trackMap
   * @param trackMap the dictionary to append to
   */
  static generateTxQueueTrackMap = async (
    trackMap: Map<InputUtxo, Utxo | undefined>
  ): Promise<void> => {
    const dbSignedTxs = await dbAction.getSignedActiveTxsInChain(
      ChainsConstants.cardano
    );
    dbSignedTxs.forEach((txEntity) => {
      const cardanoTx = CardanoTransaction.fromJson(txEntity.txJson);

      const inputIds: InputUtxo[] =
        CardanoUtils.getPaymentTxInputIds(cardanoTx);

      const outputs = this.deserialize(cardanoTx.txBytes).body().outputs();
      for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i);
        const address = output.address().to_bech32();
        if (address === CardanoConfigs.bankAddress) {
          inputIds.forEach((inputId) => {
            trackMap.set(
              inputId,
              CardanoUtils.transactionOutputToUtxo(cardanoTx.txId, i, output)
            );
          });
          break;
        }
      }
    });
  };

  /**
   * track utxo to last box using track map
   * @param utxo input utxo
   * @param trackUtxosMap the track map
   */
  static trackUtxoInMap = (
    utxo: Utxo,
    trackUtxosMap: Map<InputUtxo, Utxo | undefined>
  ): Utxo => {
    let lastUtxo = utxo;
    const trackMapKeys = Array.from(trackUtxosMap.keys());

    let nextBoxIdExists = true;
    while (nextBoxIdExists) {
      const nextBoxId = trackMapKeys.find(
        (usedUtxo) =>
          usedUtxo.txHash === lastUtxo.tx_hash &&
          usedUtxo.txIndex === lastUtxo.tx_index
      );
      if (!nextBoxId) {
        nextBoxIdExists = false;
      } else {
        lastUtxo = trackUtxosMap.get(nextBoxId)!;
      }
    }
    return lastUtxo;
  };

  /**
   * getting all address utxos, track and filter them, and return minimum amount of required box to be in the input of transaction
   * @param lockBoxes all utxos of bankAddress
   * @param requiredAssets required assets to be in the input of transaction
   * @param trackUtxosMap mapping for track boxes
   * @param usedUtxos list of used boxes
   * @return minimum required box to be in the input of the transaction
   */
  static getCoveringUtxo = (
    lockBoxes: Array<Utxo>,
    requiredAssets: UtxoBoxesAssets,
    trackUtxosMap: Map<InputUtxo, Utxo | undefined>,
    usedUtxos: InputUtxo[]
  ): Array<Utxo> => {
    const result: Array<Utxo> = [];
    let coveredLovelace = BigNum.zero();

    const requiredADA = requiredAssets.lovelace;
    const requiredMultiAssets = requiredAssets.assets;
    const requiredAssetsMap =
      CardanoUtils.multiAssetToAssetMap(requiredMultiAssets);

    for (
      let i = 0;
      (requiredAssetsMap.size > 0 ||
        requiredADA.compare(coveredLovelace) > 0) &&
      i < lockBoxes.length;
      i++
    ) {
      let isAdded = false;
      const utxo = lockBoxes[i];
      // check if the box does NOT exist in usedUtxos list
      if (
        !usedUtxos.find(
          (usedUtxo) =>
            usedUtxo.txHash === utxo.tx_hash &&
            usedUtxo.txIndex === utxo.tx_index
        )
      ) {
        // track the box using txQueue
        const lastUTxo = this.trackUtxoInMap(utxo, trackUtxosMap);
        if (requiredAssetsMap.size > 0) {
          for (const assetPair of requiredAssetsMap) {
            const assetIndex = lastUTxo.asset_list.findIndex(
              (asset) =>
                asset.asset_name ===
                  Utils.Uint8ArrayToHexString(assetPair[0].assetName) &&
                asset.policy_id ===
                  Utils.Uint8ArrayToHexString(assetPair[0].policyId)
            );
            if (assetIndex !== -1) {
              const asset = lastUTxo.asset_list[assetIndex];
              if (BigNum.from_str(asset.quantity).compare(assetPair[1]) >= 0) {
                requiredAssetsMap.delete(assetPair[0]);
              } else {
                requiredAssetsMap.set(
                  assetPair[0],
                  assetPair[1].checked_sub(BigNum.from_str(asset.quantity))
                );
              }
              if (!isAdded) {
                coveredLovelace = coveredLovelace.checked_add(
                  BigNum.from_str(lastUTxo.value)
                );
                result.push(lastUTxo);
              }
              isAdded = true;
            }
          }
        }
        if (!isAdded && requiredADA.compare(coveredLovelace) > 0) {
          coveredLovelace = coveredLovelace.checked_add(
            BigNum.from_str(lastUTxo.value)
          );
          result.push(lastUTxo);
        }
      }
    }

    if (requiredADA.compare(coveredLovelace) > 0)
      throw new NotEnoughValidBoxesError(
        `Not enough lovelace in the bank. required: ${requiredADA.to_str()}, found ${coveredLovelace.to_str()}`
      );
    if (requiredAssetsMap.size > 0)
      throw new NotEnoughValidBoxesError(
        `Not enough asset in the bank. Shortage: ${JSON.stringify(
          Array.from(requiredAssetsMap)
        )}`
      );
    return result;
  };

  /**
   * tracks lock boxes with tx queue and filter used boxes in unsigned txs of txAgreement and db
   * @param required required amount of erg and tokens
   */
  static trackAndFilterLockBoxes = async (
    required: UtxoBoxesAssets
  ): Promise<Utxo[]> => {
    const trackUtxosMap = new Map<InputUtxo, Utxo | undefined>();

    // generate tx queue dictionary
    await this.generateTxQueueTrackMap(trackUtxosMap);

    // get unsigned txs input boxes from database
    const dbUnsignedTxs = await dbAction.getUnsignedActiveTxsInChain(
      ChainsConstants.cardano
    );
    let usedBoxIds = dbUnsignedTxs.flatMap((txEntity) =>
      CardanoUtils.getPaymentTxInputIds(
        CardanoTransaction.fromJson(txEntity.txJson)
      )
    );

    // get unsigned txs input boxes from txAgreement
    const txAgreementUsedInputBoxes =
      txAgreement.getCardanoPendingTransactionsInputs();
    usedBoxIds = usedBoxIds.concat(txAgreementUsedInputBoxes);

    // get boxes and apply track and filter
    const addressBoxes = await KoiosApi.getAddressBoxes(
      CardanoConfigs.bankAddress
    );
    return this.getCoveringUtxo(
      addressBoxes,
      required,
      trackUtxosMap,
      usedBoxIds
    );
  };

  /**
   * checks if lock address assets are more than required assets or not
   * @param required required amount of erg and tokens
   */
  static hasLockAddressEnoughAssets = async (
    required: UtxoBoxesAssets
  ): Promise<boolean> => {
    // get lock lovelace
    const lockLovelace = (
      await KoiosApi.getAddressInfo(CardanoConfigs.bankAddress)
    ).balance;

    if (required.lovelace.compare(BigNum.from_str(lockLovelace.toString())) > 0)
      return false;

    // get lock assets
    const assets = (await KoiosApi.getAddressAssets(CardanoConfigs.bankAddress))
      .asset_list;

    // iterate over required assets and compared required amount to locked amount
    for (let i = 0; i < required.assets.keys().len(); i++) {
      const policyId = required.assets.keys().get(i);
      const hexPolicyId = policyId.to_hex();
      const policyAssets = required.assets.get(policyId);

      if (!policyAssets)
        throw new ImpossibleBehavior(
          'MultiAsset contains policyId with no assetName'
        );

      for (let j = 0; j < policyAssets.keys().len(); j++) {
        const assetName = policyAssets.keys().get(j);
        const hexAssetName = assetName.to_js_value();
        const assetAmount = policyAssets.get(assetName);

        if (!assetAmount)
          throw new ImpossibleBehavior(
            'MultiAsset contains assetName with no amount'
          );

        const lockedAmount = assets.find(
          (asset) =>
            asset.policy_id === hexPolicyId && asset.asset_name === hexAssetName
        );

        if (
          !lockedAmount ||
          assetAmount?.compare(BigNum.from_str(lockedAmount.quantity)) > 0
        )
          return false;
      }
    }

    return true;
  };
}

export default CardanoTrack;
