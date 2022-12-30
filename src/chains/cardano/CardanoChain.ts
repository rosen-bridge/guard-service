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
import ChainsConstants from '../ChainsConstants';
import { dbAction } from '../../db/DatabaseAction';
import Configs from '../../helpers/Configs';
import { Buffer } from 'buffer';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { TssFailedSign, TssSuccessfulSign } from '../../models/Interfaces';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../guard/MinimumFee';
import {
  FailedError,
  NetworkError,
  NotEnoughAssetsError,
  NotFoundError,
  UnexpectedApiError,
} from '../../helpers/errors';

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
   * verifies the payment transaction data with the event
   *  1. checks address of all boxes except payment box
   *  2. checks transaction metadata
   *  3. checks amount of lovelace in payment box
   *  4. checks number of multiAssets in payment box
   *  5. checks number of assets in payment box paymentMultiAsset (asset payment)
   *  6. checks amount for paymentAsset in payment box (asset payment)
   *  7. checks address of payment box
   * @param paymentTx the payment transaction
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return true if tx verified
   */
  verifyTransactionWithEvent = async (
    paymentTx: CardanoTransaction,
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<boolean> => {
    const tx = this.deserialize(paymentTx.txBytes);
    const outputBoxes = tx.body().outputs();

    // verify that all other boxes belong to bank
    for (let i = 1; i < outputBoxes.len(); i++)
      if (
        outputBoxes.get(i).address().to_bech32() !==
        this.bankAddress.to_bech32()
      )
        return false;

    // verify all bank boxes have no metadata
    if (tx.auxiliary_data()) return false;

    // verify event conditions
    const paymentBox = outputBoxes.get(0);
    if (event.targetChainTokenId === 'lovelace') {
      // ADA payment case
      const lovelacePaymentAmount: BigNum = CardanoChain.getPaymentAmount(
        event,
        feeConfig
      );
      const sizeOfMultiAssets: number | undefined = paymentBox
        .amount()
        .multiasset()
        ?.len();

      return (
        paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
        (sizeOfMultiAssets === undefined || sizeOfMultiAssets === 0) &&
        paymentBox.address().to_bech32() === event.toAddress
      );
    } else {
      // Token payment case
      const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
      const assetPaymentAmount: BigNum = CardanoChain.getPaymentAmount(
        event,
        feeConfig
      );
      const multiAssets = paymentBox.amount().multiasset();
      if (multiAssets === undefined || multiAssets.len() !== 1) return false;
      else {
        const multiAssetPolicyId: ScriptHash = multiAssets.keys().get(0);
        if (multiAssets.get(multiAssetPolicyId)!.len() !== 1) return false;
      }

      const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
        event.targetChainTokenId
      );
      const paymentAssetPolicyId: ScriptHash = ScriptHash.from_bytes(
        paymentAssetInfo.policyId
      );
      const paymentAssetAssetName: AssetName = AssetName.new(
        paymentAssetInfo.assetName
      );
      const paymentAssetAmount: BigNum | undefined = paymentBox
        .amount()
        .multiasset()
        ?.get_asset(paymentAssetPolicyId, paymentAssetAssetName);

      return (
        paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
        paymentAssetAmount !== undefined &&
        paymentAssetAmount.compare(assetPaymentAmount) === 0 &&
        paymentBox.address().to_bech32() === event.toAddress
      );
    }
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
   * verified the event payment in the Cardano
   * conditions that checks:
   *  1- having atLeast 1 asset in the first output of the transaction
   *  2- the asset should be listed on the tokenMap config
   *  3- tx metaData should have "0" key
   * @param event
   * @param RWTId
   */
  verifyEventWithPayment = async (
    event: EventTrigger,
    RWTId: string
  ): Promise<boolean> => {
    const eventId = Utils.txIdToEventId(event.sourceTxId);
    // Verifying watcher RWTs
    if (RWTId !== CardanoConfigs.cardanoContractConfig.RWTId) {
      logger.info(
        `The event [${eventId}] is not valid, event RWT is not compatible with cardano RWT id`
      );
      return false;
    }
    try {
      const txInfo = (await KoiosApi.getTxInformation([event.sourceTxId]))[0];
      const payment = txInfo.outputs.filter((utxo: Utxo) => {
        return (
          CardanoConfigs.lockAddresses.find(
            (address) => address === utxo.payment_addr.bech32
          ) !== undefined
        );
      })[0];
      if (payment) {
        if (!txInfo.metadata) {
          logger.info(
            `The event [${eventId}] is not valid, tx [${event.sourceTxId}] has no transaction metadata`
          );
          return false;
        }
        const data = CardanoUtils.getRosenData(txInfo.metadata);
        if (data) {
          let tokenCheck = false,
            eventToken,
            targetTokenId,
            amount;
          try {
            eventToken = Configs.tokenMap.search(ChainsConstants.cardano, {
              [Configs.tokenMap.getIdKey(ChainsConstants.cardano)]:
                event.sourceChainTokenId,
            });
            targetTokenId = Configs.tokenMap.getID(
              eventToken[0],
              event.toChain
            );
          } catch (e) {
            logger.info(
              `Event [${eventId}] is not valid, tx [${event.sourceTxId}] token or chainId is invalid`
            );
            return false;
          }
          if (event.sourceChainTokenId == ChainsConstants.cardanoNativeAsset) {
            amount = payment.value;
            tokenCheck = true;
          } else if (payment.asset_list.length !== 0) {
            const asset = payment.asset_list[0];
            const eventAssetPolicyId =
              eventToken[0][ChainsConstants.cardano]['policyId'];
            const eventAssetId =
              eventToken[0][ChainsConstants.cardano]['assetName'];
            amount = asset.quantity;
            if (
              !(
                eventAssetPolicyId == asset.policy_id &&
                eventAssetId == asset.asset_name
              )
            ) {
              logger.info(
                `Event [${eventId}] is not valid, tx [${event.sourceTxId}] asset credential is incorrect`
              );
              return false;
            }
            tokenCheck = true;
          }
          if (
            tokenCheck &&
            event.fromChain == ChainsConstants.cardano &&
            event.toChain == data.toChain &&
            event.networkFee == data.networkFee &&
            event.bridgeFee == data.bridgeFee &&
            event.targetChainTokenId == targetTokenId &&
            event.amount == amount &&
            event.toAddress == data.toAddress &&
            event.fromAddress == data.fromAddress &&
            event.sourceBlockId == txInfo.block_hash
          ) {
            try {
              // check if amount is more than fees
              const feeConfig = await MinimumFee.getEventFeeConfig(event);
              const eventAmount = BigInt(event.amount);
              const usedBridgeFee = Utils.maxBigint(
                BigInt(event.bridgeFee),
                feeConfig.bridgeFee
              );
              const usedNetworkFee = Utils.maxBigint(
                BigInt(event.networkFee),
                feeConfig.networkFee
              );
              if (eventAmount < usedBridgeFee + usedNetworkFee) {
                logger.info(
                  `Event [${eventId}] is not valid, event amount [${eventAmount}] is less than sum of bridgeFee [${usedBridgeFee}] and networkFee [${usedNetworkFee}]`
                );
                return false;
              }
            } catch (e) {
              throw new UnexpectedApiError(
                `Failed in comparing event amount to fees: ${e}`
              );
            }
            logger.info(`Event [${eventId}] has been successfully validated`);
            return true;
          } else {
            logger.info(
              `Event [${eventId}] is not valid, event data does not match with lock tx [${event.sourceTxId}]`
            );
            return false;
          }
        } else {
          logger.info(
            `Event [${eventId}] is not valid, failed to get rosen data from lock tx [${event.sourceTxId}]`
          );
          return false;
        }
      } else {
        logger.info(
          `Event [${eventId}] is not valid, no lock box found in tx [${event.sourceTxId}]`
        );
        return false;
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        logger.info(
          `Event [${eventId}] is not valid, lock tx [${event.sourceTxId}] is not available in network`
        );
        return false;
      } else if (
        e instanceof FailedError ||
        e instanceof NetworkError ||
        e instanceof UnexpectedApiError
      ) {
        throw Error(`Skipping event [${eventId}] validation: ${e}`);
      } else {
        logger.warn(`Event [${eventId}] validation failed: ${e.stack}`);
        return false;
      }
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
