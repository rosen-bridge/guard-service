import {
  Address,
  BigNum,
  hash_transaction,
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
import { Buffer } from 'buffer';
import { UtxoBoxesAssets } from './models/Interfaces';
import BlockFrostApi from './network/BlockFrostApi';
import { TransactionTypes } from '../../models/Models';
import { loggerFactory } from '../../log/Logger';
import CardanoUtils from './helpers/CardanoUtils';
import { ImpossibleBehavior } from '../../helpers/errors';
import CardanoTrack from './CardanoTrack';

const logger = loggerFactory(import.meta.url);

class CardanoColdStorage {
  static lockAddress = Address.from_bech32(CardanoConfigs.lockAddress);
  static coldAddress = Address.from_bech32(CardanoConfigs.coldAddress);

  /**
   * generates unsigned transaction to transfer assets to cold storage in cardano chain
   * @return the generated asset transfer transaction
   */
  static generateTransaction = async (
    transferringAssets: UtxoBoxesAssets
  ): Promise<CardanoTransaction> => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);

    // add two minimum lovelace and txFee if current transferring lovelace is less than that
    const txMinimumNeededLovelace = CardanoConfigs.txMinimumLovelace
      .checked_mul(BigNum.from_str('2'))
      .checked_add(CardanoConfigs.txFee);
    const requiredAssets: UtxoBoxesAssets = {
      lovelace: transferringAssets.lovelace.less_than(txMinimumNeededLovelace)
        ? txMinimumNeededLovelace
        : transferringAssets.lovelace,
      assets: transferringAssets.assets,
    };

    const lockBoxes = await CardanoTrack.trackAndFilterLockBoxes(
      requiredAssets
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
        throw new ImpossibleBehavior(
          'MultiAsset contains policyId with no assetName'
        );

      for (let j = 0; j < policyAssets.len(); j++) {
        const assetName = policyAssets.keys().get(j);
        const assetSpentValue = policyAssets.get(assetName);
        if (!assetSpentValue)
          throw new ImpossibleBehavior(
            'MultiAsset contains assetName with no amount'
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
