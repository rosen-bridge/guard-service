import {
  Address,
  AssetName,
  BigNum,
  MultiAsset,
  ScriptHash,
  Transaction,
} from '@emurgo/cardano-serialization-lib-nodejs';
import KoiosApi from './network/KoiosApi';
import { EventTrigger } from '../../models/Models';
import CardanoConfigs from './helpers/CardanoConfigs';
import CardanoUtils from './helpers/CardanoUtils';
import CardanoTransaction from './models/CardanoTransaction';
import ChainsConstants from '../ChainsConstants';
import Configs from '../../helpers/Configs';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../event/MinimumFee';
import {
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  NotFoundError,
  UnexpectedApiError,
} from '../../helpers/errors';
import { CardanoKoiosRosenExtractor } from '@rosen-bridge/rosen-extractor';

const logger = loggerFactory(import.meta.url);

// TODO: include this class in refactor (#109)
class CardanoTxVerifier {
  static lockAddress = Address.from_bech32(CardanoConfigs.lockAddress);
  static coldAddress = Address.from_bech32(CardanoConfigs.coldAddress);
  static rosenExtractor = new CardanoKoiosRosenExtractor(
    CardanoConfigs.lockAddress,
    Configs.tokens(),
    logger
  );

  /**
   * verifies the payment transaction data with the event
   *  1. checks address of all boxes except payment box
   *  2. checks transaction metadata
   *  3. checks amount of lovelace in payment box
   *  4. checks number of multiAssets in payment box
   *  5. checks number of assets in payment box paymentMultiAsset (asset payment)
   *  6. checks amount for paymentAsset in payment box (asset payment)
   *  7. checks address of payment box
   *  8. checks transaction fee
   * @param paymentTx the payment transaction
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return true if tx verified
   */
  static verifyTransactionWithEvent = async (
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
        this.lockAddress.to_bech32()
      ) {
        logger.debug(
          `Tx [${paymentTx.txId}] invalid: Outbox address [${outputBoxes
            .get(i)
            .address()
            .to_bech32()}] is not equal to lockAddress [${this.lockAddress.to_bech32()}]`
        );
        return false;
      }

    // verify tx has no metadata
    if (tx.auxiliary_data()) {
      logger.debug(`Tx [${paymentTx.txId}] invalid: Contains metadata`);
      return false;
    }

    // verify event conditions
    const paymentBox = outputBoxes.get(0);
    if (event.targetChainTokenId === 'lovelace') {
      // ADA payment case
      const lovelacePaymentAmount: BigNum = this.getPaymentAmount(
        event,
        feeConfig
      );
      const sizeOfMultiAssets: number | undefined = paymentBox
        .amount()
        .multiasset()
        ?.len();

      if (
        paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
        (sizeOfMultiAssets === undefined || sizeOfMultiAssets === 0) &&
        paymentBox.address().to_bech32() === event.toAddress
      )
        return true;
      else {
        logger.debug(
          `Tx [${paymentTx.txId}] invalid: PaymentBox conditions are not met`
        );
        return false;
      }
    } else {
      // Token payment case
      const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
      const assetPaymentAmount: BigNum = this.getPaymentAmount(
        event,
        feeConfig
      );
      const multiAssets = paymentBox.amount().multiasset();
      if (multiAssets === undefined || multiAssets.len() !== 1) {
        logger.debug(
          `Tx [${paymentTx.txId}] invalid: Size of policyIds is invalid`
        );
        return false;
      } else {
        const multiAssetPolicyId: ScriptHash = multiAssets.keys().get(0);
        if (multiAssets.get(multiAssetPolicyId)!.len() !== 1) {
          logger.debug(
            `Tx [${paymentTx.txId}] invalid: Size of assets for the policyId is invalid`
          );
          return false;
        }
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

      if (
        paymentBox.amount().coin().compare(lovelacePaymentAmount) !== 0 ||
        paymentAssetAmount === undefined ||
        paymentAssetAmount.compare(assetPaymentAmount) !== 0 ||
        paymentBox.address().to_bech32() !== event.toAddress
      ) {
        logger.debug(
          `Tx [${paymentTx.txId}] invalid: PaymentBox conditions are not met`
        );
        return false;
      }
    }

    // verify tx fee
    if (tx.body().fee().compare(CardanoConfigs.txFee) > 0) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: Transaction fee [${tx
          .body()
          .fee()
          .to_str()}] is more than maximum allowed fee [${CardanoConfigs.txFee.to_str()}]`
      );
      return false;
    }

    return true;
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
  static verifyColdStorageTransaction = async (
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
    const assets = (await KoiosApi.getAddressAssets(CardanoConfigs.lockAddress))
      .asset_list;
    const addressLovelace = (
      await KoiosApi.getAddressInfo(CardanoConfigs.lockAddress)
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
      const lockLovelace =
        BigInt(addressLovelace) -
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

  /**
   * verified the event payment in the Cardano
   * conditions that checks:
   *  1- having atLeast 1 asset in the first output of the transaction
   *  2- the asset should be listed on the tokenMap config
   *  3- tx metaData should have "0" key
   * @param event
   * @param RWTId
   */
  static verifyEventWithPayment = async (
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
      const paymentTx = (
        await KoiosApi.getTxInformation([event.sourceTxId])
      )[0];
      const data = this.rosenExtractor.get(paymentTx);
      if (!data) {
        logger.info(
          `Event [${eventId}] is not valid, failed to extract rosen data from lock transaction`
        );
        return false;
      }
      if (
        event.fromChain == ChainsConstants.cardano &&
        event.toChain == data.toChain &&
        event.networkFee == data.networkFee &&
        event.bridgeFee == data.bridgeFee &&
        event.amount == data.amount &&
        event.sourceChainTokenId == data.sourceChainTokenId &&
        event.targetChainTokenId == data.targetChainTokenId &&
        event.sourceBlockId == paymentTx.block_hash &&
        event.toAddress == data.toAddress &&
        event.fromAddress == data.fromAddress
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
        logger.warn(`Event [${eventId}] validation failed: ${e}`);
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

export default CardanoTxVerifier;
