import {
  Address,
  AssetName,
  Assets,
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
  Vkeywitness,
  Vkeywitnesses,
} from '@emurgo/cardano-serialization-lib-nodejs';
import KoiosApi from './network/KoiosApi';
import {
  EventTrigger,
  PaymentTransaction,
  TransactionStatus,
  TransactionTypes,
} from '../../models/Models';
import BaseChain from '../BaseChains';
import CardanoConfigs from './helpers/CardanoConfigs';
import BlockFrostApi from './network/BlockFrostApi';
import { Utxo } from './models/Interfaces';
import CardanoUtils from './helpers/CardanoUtils';
import TssSigner from '../../guard/TssSigner';
import CardanoTransaction from './models/CardanoTransaction';
import { dbAction } from '../../db/DatabaseAction';
import { Buffer } from 'buffer';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { TssFailedSign, TssSuccessfulSign } from '../../models/Interfaces';
import { Fee } from '@rosen-bridge/minimum-fee';
import { NotEnoughAssetsError } from '../../helpers/errors';

const logger = loggerFactory(import.meta.url);

class CardanoChain implements BaseChain<Transaction, CardanoTransaction> {
  bankAddress = Address.from_bech32(CardanoConfigs.bankAddress);

  /**
   *  getting all address utxos and return minimum amount of required box to be in the input of transaction
   *      with respect to the event
   * @param addressBoxes all utxos of bankAddress
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return minimum required box to be in the input of the transaction
   */
  getCoveringUtxo = (
    addressBoxes: Array<Utxo>,
    event: EventTrigger,
    feeConfig: Fee
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

    if (event.targetChainTokenId === 'lovelace') {
      const paymentAmount: BigNum = CardanoChain.getPaymentAmount(
        event,
        feeConfig
      );
      for (
        let i = 0;
        paymentAmount.compare(coveredLovelace) > 0 && i < addressBoxes.length;
        i++
      ) {
        const utxo = addressBoxes[shuffleIndexes[i]];
        coveredLovelace = coveredLovelace.checked_add(
          BigNum.from_str(utxo.value)
        );
        result.push(utxo);
      }
      if (paymentAmount.compare(coveredLovelace) > 0)
        throw new Error(
          `An error occurred, theres is no enough lovelace in the bank`
        );
      return result;
    } else {
      const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
      const assetPaymentAmount: BigNum = CardanoChain.getPaymentAmount(
        event,
        feeConfig
      );
      const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
        event.targetChainTokenId
      );
      const assetPolicyId = Utils.Uint8ArrayToHexString(
        paymentAssetInfo.policyId
      );
      const assetAssetName = Utils.Uint8ArrayToHexString(
        paymentAssetInfo.assetName
      );

      let covered = BigNum.from_str('0');

      for (
        let i = 0;
        (assetPaymentAmount.compare(covered) > 0 ||
          lovelacePaymentAmount.compare(coveredLovelace) > 0) &&
        i < addressBoxes.length;
        i++
      ) {
        let isAdded = false;
        const utxo = addressBoxes[shuffleIndexes[i]];
        if (assetPaymentAmount.compare(covered) > 0) {
          const assetIndex = utxo.asset_list.findIndex(
            (asset) =>
              asset.asset_name === assetAssetName &&
              asset.policy_id === assetPolicyId
          );
          if (assetIndex !== -1) {
            const asset = utxo.asset_list[assetIndex];
            covered = covered.checked_add(BigNum.from_str(asset.quantity));
            coveredLovelace = coveredLovelace.checked_add(
              BigNum.from_str(utxo.value)
            );
            result.push(utxo);
            isAdded = true;
          }
        }
        if (!isAdded && lovelacePaymentAmount.compare(coveredLovelace) > 0) {
          coveredLovelace = coveredLovelace.checked_add(
            BigNum.from_str(utxo.value)
          );
          result.push(utxo);
        }
      }
      if (lovelacePaymentAmount.compare(coveredLovelace) > 0)
        throw new NotEnoughAssetsError(
          `Not enough lovelace in the bank. required: ${lovelacePaymentAmount.to_str()}, found ${coveredLovelace.to_str()}`
        );
      if (assetPaymentAmount.compare(covered) > 0)
        throw new NotEnoughAssetsError(
          `Not enough asset in the bank. required: ${assetPaymentAmount.to_str()}, found ${covered.to_str()}`
        );
    }
    return result;
  };

  /**
   * generates payment transaction of the event from threshold-sig address in target chain
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  generateTransaction = async (
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<CardanoTransaction> => {
    const txBuilder = TransactionBuilder.new(CardanoConfigs.txBuilderConfig);

    const bankBoxes = this.getCoveringUtxo(
      await KoiosApi.getAddressBoxes(CardanoConfigs.bankAddress),
      event,
      feeConfig
    );

    // add input boxes
    bankBoxes.forEach((box) => {
      const txHash = TransactionHash.from_bytes(
        Buffer.from(box.tx_hash, 'hex')
      );
      const inputBox = TransactionInput.new(txHash, box.tx_index);
      txBuilder.add_input(
        this.bankAddress,
        inputBox,
        Value.new(BigNum.from_str(event.amount))
      );
    });

    // add output boxes
    if (event.targetChainTokenId === 'lovelace')
      this.lovelacePaymentOutputBoxes(event, bankBoxes, feeConfig).forEach(
        (box) => txBuilder.add_output(box)
      );
    else
      this.assetPaymentOutputBoxes(event, bankBoxes, feeConfig).forEach((box) =>
        txBuilder.add_output(box)
      );

    // set transaction TTL and Fee
    txBuilder.set_ttl(
      (await BlockFrostApi.currentSlot()) + CardanoConfigs.txTtl
    );
    txBuilder.set_fee(CardanoConfigs.txFee);

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
    const eventId = event.getId();
    const paymentTx = new CardanoTransaction(
      txId,
      eventId,
      txBytes,
      TransactionTypes.payment
    ); // we don't need inputBoxes in PaymentTransaction for Cardano tx

    logger.info(
      `Payment transaction [${txId}] for event [${eventId}] generated`
    );
    return paymentTx;
  };

  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  serialize = (tx: Transaction): Uint8Array => {
    return tx.to_bytes();
  };

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  deserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.from_bytes(txBytes);
  };

  /**
   * generates payment transaction (to pay ADA) of the event from threshold-sig address in cardano chain
   * @param event the event trigger model
   * @param inBoxes threshold-sig address boxes
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  lovelacePaymentOutputBoxes = (
    event: EventTrigger,
    inBoxes: Utxo[],
    feeConfig: Fee
  ): TransactionOutput[] => {
    // calculate assets of payment box
    const paymentAmount: BigNum = CardanoChain.getPaymentAmount(
      event,
      feeConfig
    );

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      Value.new(paymentAmount)
    );

    // calculate assets and lovelace of change box
    const changeBoxAssets = CardanoUtils.calculateInputBoxesAssets(inBoxes);
    const multiAsset = changeBoxAssets.assets;
    let changeBoxLovelace: BigNum = changeBoxAssets.lovelace;

    // reduce fee and payment amount from change box lovelace
    changeBoxLovelace = changeBoxLovelace
      .checked_sub(CardanoConfigs.txFee)
      .checked_sub(paymentAmount);

    // create change box
    const changeAmount: Value = Value.new(changeBoxLovelace);
    changeAmount.set_multiasset(multiAsset);
    const changeBox = TransactionOutput.new(this.bankAddress, changeAmount);

    return [paymentBox, changeBox];
  };

  /**
   * generates payment transaction (to pay token) of the event from threshold-sig address in cardano chain
   * @param event the event trigger model
   * @param inBoxes threshold-sig address boxes
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  assetPaymentOutputBoxes = (
    event: EventTrigger,
    inBoxes: Utxo[],
    feeConfig: Fee
  ): TransactionOutput[] => {
    // calculate assets of payment box
    const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
    const assetPaymentAmount: BigNum = CardanoChain.getPaymentAmount(
      event,
      feeConfig
    );

    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      event.targetChainTokenId
    );
    const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
      paymentAssetInfo.policyId
    );
    const paymentAssetAssetName: AssetName = AssetName.new(
      paymentAssetInfo.assetName
    );
    const paymentMultiAsset = MultiAsset.new();
    const paymentAssets = Assets.new();
    paymentAssets.insert(paymentAssetAssetName, assetPaymentAmount);
    paymentMultiAsset.insert(paymentAssetPolicyId, paymentAssets);
    const paymentValue = Value.new(lovelacePaymentAmount);
    paymentValue.set_multiasset(paymentMultiAsset);

    // create the payment box
    const paymentBox = TransactionOutput.new(
      Address.from_bech32(event.toAddress),
      paymentValue
    );

    // calculate assets and lovelace of change box
    const changeBoxAssets = CardanoUtils.calculateInputBoxesAssets(inBoxes);
    const multiAsset = changeBoxAssets.assets;
    let changeBoxLovelace: BigNum = changeBoxAssets.lovelace;

    // reduce fee and payment amount from change box lovelace
    changeBoxLovelace = changeBoxLovelace
      .checked_sub(CardanoConfigs.txFee)
      .checked_sub(lovelacePaymentAmount);

    const paymentAssetAmount: BigNum = multiAsset.get_asset(
      paymentAssetPolicyId,
      paymentAssetAssetName
    );
    multiAsset.set_asset(
      paymentAssetPolicyId,
      paymentAssetAssetName,
      paymentAssetAmount.checked_sub(assetPaymentAmount)
    );

    // create change box
    const changeAmount: Value = Value.new(changeBoxLovelace);
    changeAmount.set_multiasset(multiAsset);
    const changeBox = TransactionOutput.new(this.bankAddress, changeAmount);

    return [paymentBox, changeBox];
  };

  /**
   * requests TSS service to sign a cardano transaction
   * @param paymentTx the payment transaction
   */
  requestToSignTransaction = async (
    paymentTx: PaymentTransaction
  ): Promise<void> => {
    const tx = this.deserialize(paymentTx.txBytes);
    try {
      // change tx status to inSign
      await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.inSign);

      // send tx to sign
      const txHash = hash_transaction(tx.body()).to_bytes();
      await TssSigner.signTxHash(txHash);
    } catch (e) {
      logger.warn(
        `An error occurred while requesting TSS service to sign Cardano tx: [${e.stack}]`
      );
    }
  };

  /**
   * signs a cardano transaction
   * @param message response message
   * @param status signed hash of the transaction
   */
  signTransaction = async (
    message: string,
    status: string
  ): Promise<CardanoTransaction | null> => {
    if (status !== 'ok') {
      const response = JSON.parse(message) as TssFailedSign;
      const txId = response.m;

      logger.info(`TSS failed to sign tx [${txId}]: ${response.error}`);
      await dbAction.setTxStatus(txId, TransactionStatus.signFailed);

      return null;
    }

    const response = JSON.parse(message) as TssSuccessfulSign;
    const txId = response.m;
    const signedTxHash = response.signature;

    // get tx from db
    let tx: Transaction | null = null;
    let paymentTx: PaymentTransaction | null = null;
    try {
      const txEntity = await dbAction.getTxById(txId);
      paymentTx = PaymentTransaction.fromJson(txEntity.txJson);
      tx = this.deserialize(paymentTx.txBytes);
    } catch (e) {
      logger.warn(
        `An error occurred while getting Cardano tx [${txId}] from db: ${e.stack}`
      );
      return null;
    }

    // make vKey witness: 825840 + publicKey + 5840 + signedTxHash
    const vKeyWitness = Vkeywitness.from_bytes(
      Buffer.from(
        `825820${CardanoConfigs.aggregatedPublicKey}5840${signedTxHash}`,
        'hex'
      )
    );

    const vkeyWitnesses = Vkeywitnesses.new();
    vkeyWitnesses.add(vKeyWitness);
    const witnesses = TransactionWitnessSet.new();
    witnesses.set_vkeys(vkeyWitnesses);

    const signedTx = Transaction.new(tx.body(), witnesses);

    // update database
    const signedPaymentTx = new CardanoTransaction(
      txId,
      paymentTx.eventId,
      this.serialize(signedTx),
      paymentTx.txType
    );
    await dbAction.updateWithSignedTx(txId, signedPaymentTx.toJson());
    logger.info(`Cardano tx [${txId}] signed successfully`);

    return signedPaymentTx;
  };

  /**
   * submit a cardano transaction to network
   * @param paymentTx the payment transaction
   */
  submitTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
    const tx = this.deserialize(paymentTx.txBytes);
    try {
      await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.sent);
      const response = await BlockFrostApi.txSubmit(tx);
      logger.info('Cardano Transaction submitted', { txId: response });
    } catch (e) {
      logger.warn(
        `An error occurred while submitting Cardano transaction: ${e.stack}`
      );
    }
  };

  /**
   * subtracts bridge fee and network fee from event amount
   * @param event
   * @param feeConfig the minimum fee config
   */
  static getPaymentAmount = (event: EventTrigger, feeConfig: Fee): BigNum => {
    const bridgeFee: BigNum =
      BigNum.from_str(event.bridgeFee).compare(
        BigNum.from_str(feeConfig.bridgeFee.toString())
      ) > 0
        ? BigNum.from_str(event.bridgeFee)
        : BigNum.from_str(feeConfig.bridgeFee.toString());
    const networkFee: BigNum = BigNum.from_str(event.networkFee).compare(
      BigNum.from_str(feeConfig.networkFee.toString())
    )
      ? BigNum.from_str(event.networkFee)
      : BigNum.from_str(feeConfig.networkFee.toString());
    return BigNum.from_str(event.amount)
      .checked_sub(bridgeFee)
      .checked_sub(networkFee);
  };
}

export default CardanoChain;
