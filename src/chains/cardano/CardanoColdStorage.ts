import {
  Address,
  AssetName,
  BigNum,
  hash_transaction,
  MultiAsset,
  ScriptHash,
  Transaction,
  TransactionBuilder,
  TransactionHash,
  TransactionInput,
  TransactionOutput,
  TransactionWitnessSet,
  Value,
} from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoConfigs from './helpers/CardanoConfigs';
import CardanoTransaction from './models/CardanoTransaction';
import KoiosApi from './network/KoiosApi';
import { Buffer } from 'buffer';
import { UtxoBoxesAssets } from './models/Interfaces';
import BlockFrostApi from './network/BlockFrostApi';
import { TransactionTypes } from '../../models/Models';
import { logger } from '../../log/Logger';
import CardanoUtils from './helpers/CardanoUtils';
import Configs from '../../helpers/Configs';
import ChainsConstants from '../ChainsConstants';
import Utils from '../../helpers/Utils';

class CardanoColdStorage {
  static lockAddress = Address.from_bech32(CardanoConfigs.bankAddress);
  static coldAddress = Address.from_bech32(CardanoConfigs.coldAddress);

  /**
   * generates unsigned transaction to transfer assets to cold storage in cardano chain
   * @return the generated asset transfer transaction
   */
  static generateTransaction = async (
    transferringAssets: UtxoBoxesAssets
  ): Promise<CardanoTransaction> => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);

    // add two minimum lovelace if current transferring ergs is less than that
    const twoMinBoxLovelace = CardanoConfigs.txMinimumLovelace.checked_mul(
      BigNum.from_str('2')
    );
    const requiredAssets: UtxoBoxesAssets = {
      lovelace: transferringAssets.lovelace.less_than(twoMinBoxLovelace)
        ? twoMinBoxLovelace
        : transferringAssets.lovelace,
      assets: transferringAssets.assets,
    };

    // TODO: use getCoveringUtxo after fixing it.
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/88
    const lockBoxes = await KoiosApi.getAddressBoxes(
      CardanoConfigs.bankAddress
    );

    // add input boxes
    lockBoxes.forEach((box) => {
      const txHash = TransactionHash.from_bytes(
        Buffer.from(box.tx_hash, 'hex')
      );
      const inputBox = TransactionInput.new(txHash, box.tx_index);
      txBuilder.add_input(
        this.lockAddress,
        inputBox,
        Value.new(requiredAssets.lovelace)
      );
    });

    // create cold box Assets object
    const coldBoxValue = Value.new(
      requiredAssets.lovelace
        .checked_sub(CardanoConfigs.txMinimumLovelace)
        .checked_sub(CardanoConfigs.txFee)
    );
    coldBoxValue.set_multiasset(transferringAssets.assets);

    // create the cold box
    const coldBox = TransactionOutput.new(this.coldAddress, coldBoxValue);

    // set transaction TTL and Fee
    txBuilder.set_ttl(
      (await BlockFrostApi.currentSlot()) + CardanoConfigs.txTtl
    );
    txBuilder.set_fee(CardanoConfigs.txFee);

    // calculate change box assets
    const changeBoxAssets = CardanoUtils.calculateInputBoxesAssets(lockBoxes);
    for (let i = 0; i < requiredAssets.assets.len(); i++) {
      const policyId = requiredAssets.assets.keys().get(i);
      const policyAssets = requiredAssets.assets.get(policyId);
      if (!policyAssets)
        throw Error(
          `Impossible behaviour from Cardano MultiAsset class detected!`
        );
      for (let j = 0; j < policyAssets.len(); j++) {
        const assetName = policyAssets.keys().get(j);
        const assetSpentValue = policyAssets.get(assetName);
        if (!assetSpentValue)
          throw Error(
            `Impossible behaviour from Cardano MultiAsset class detected!`
          );

        const targetAssetBalance = changeBoxAssets.assets.get_asset(
          policyId,
          assetName
        );
        changeBoxAssets.assets.set_asset(
          policyId,
          assetName,
          targetAssetBalance.checked_sub(assetSpentValue)
        );
      }
    }
    const changeBoxValue = Value.new(
      changeBoxAssets.lovelace
        .checked_sub(coldBoxValue.coin())
        .checked_sub(CardanoConfigs.txFee)
    );
    changeBoxValue.set_multiasset(changeBoxAssets.assets);

    // create change box
    const changeBox = TransactionOutput.new(this.lockAddress, changeBoxValue);

    // add outputs
    txBuilder.add_output(coldBox);
    txBuilder.add_output(changeBox);

    // create the transaction
    const txBody = txBuilder.build();
    const tx = Transaction.new(
      txBody,
      TransactionWitnessSet.new(),
      undefined // transaction metadata
    );

    // create PaymentTransaction object
    const txBytes = tx.to_bytes();
    const txId = Buffer.from(hash_transaction(txBody).to_bytes()).toString(
      'hex'
    );
    const cardanoTx = new CardanoTransaction(
      txId,
      '',
      txBytes,
      TransactionTypes.coldStorage
    );

    logger.info(
      `Cardano coldStorage Transaction with txId [${txId}] generated`
    );
    return cardanoTx;
  };

  /**
   * verifies the transfer transaction
   *  1. checks number of output boxes
   *  2. checks cold box ergoTree
   *  3. checks change box ergoTree
   *  4. checks transaction metadata
   *  5. checks remaining amount of assets in lockAddress after tx
   *  6. checks transaction fee
   * @param cardanoTx the transfer transaction
   * @return true if tx verified
   */
  static verifyTransaction = async (
    cardanoTx: CardanoTransaction
  ): Promise<boolean> => {
    const tx = this.deserialize(cardanoTx.txBytes);
    const outputBoxes = tx.body().outputs();

    // verify number of output boxes (1 cold box + 1 change box)
    const outputLength = outputBoxes.len();
    if (outputLength !== 2) return false;

    // verify box addresses
    if (
      outputBoxes.get(0).address().to_bech32() !==
        this.coldAddress.to_bech32() ||
      outputBoxes.get(1).address().to_bech32() !== this.lockAddress.to_bech32()
    )
      return false;

    // verify boxes have no metadata
    if (tx.auxiliary_data()) return false;

    // get lockAddress assets
    const assets = (await KoiosApi.getAddressAssets(CardanoConfigs.bankAddress))
      .assets;
    let lockLovelace = (
      await KoiosApi.getAddressInfo(CardanoConfigs.bankAddress)
    ).balance;
    const lockAddressMultiAsset = MultiAsset.new();
    assets.forEach((asset) =>
      lockAddressMultiAsset.set_asset(
        ScriptHash.from_hex(asset.policy_id),
        AssetName.new(Utils.hexStringToUint8Array(asset.asset_name)),
        BigNum.from_str(asset.quantity)
      )
    );

    // calculate remaining amount of assets in lockAddress after tx
    const coldBoxMultiAsset = outputBoxes.get(0).amount().multiasset();
    if (coldBoxMultiAsset) {
      for (let i = 0; i < coldBoxMultiAsset.len(); i++) {
        const policyId = coldBoxMultiAsset.keys().get(i);
        const policyAssets = coldBoxMultiAsset.get(policyId);
        if (!policyAssets)
          throw Error(
            `Impossible behaviour from Cardano MultiAsset class detected!`
          );
        for (let j = 0; j < policyAssets.len(); j++) {
          const assetName = policyAssets.keys().get(j);
          const assetSpentValue = policyAssets.get(assetName);
          if (!assetSpentValue)
            throw Error(
              `Impossible behaviour from Cardano MultiAsset class detected!`
            );

          const targetAssetBalance = lockAddressMultiAsset.get_asset(
            policyId,
            assetName
          );
          lockAddressMultiAsset.set_asset(
            policyId,
            assetName,
            targetAssetBalance.checked_sub(assetSpentValue)
          );
        }
      }
      lockLovelace =
        lockLovelace -
        BigInt(outputBoxes.get(0).amount().coin().to_str()) -
        BigInt(tx.body().fee().to_str());

      // verify remaining amount to be within thresholds
      const cardanoAssets = Configs.thresholds()[ChainsConstants.cardano];
      const assetFingerprints = Object.keys(cardanoAssets);
      for (let i = 0; i < assetFingerprints.length; i++) {
        const fingerprint = assetFingerprints[i];
        if (fingerprint === ChainsConstants.cardanoNativeAsset) {
          if (
            lockLovelace < cardanoAssets[fingerprint].low ||
            lockLovelace > cardanoAssets[fingerprint].high
          )
            return false;
        } else {
          const AssetInfo = CardanoUtils.getCardanoAssetInfo(fingerprint);
          const policyId = ScriptHash.from_bytes(AssetInfo.policyId);
          const assetName = AssetName.new(AssetInfo.assetName);
          const assetBalance = BigInt(
            lockAddressMultiAsset.get_asset(policyId, assetName).to_str()
          );

          if (
            assetBalance < cardanoAssets[fingerprint].low ||
            assetBalance > cardanoAssets[fingerprint].high
          )
            return false;
        }
      }
    }

    // verify transaction fee value (last box erg value)
    return tx.body().fee().compare(CardanoConfigs.txFee) <= 0;
  };

  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  static serialize = (tx: Transaction): Uint8Array => {
    return tx.to_bytes();
  };

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  static deserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.from_bytes(txBytes);
  };
}

export default CardanoColdStorage;
