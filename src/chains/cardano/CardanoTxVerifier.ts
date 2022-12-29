import {
  Address,
  AssetName,
  BigNum,
  ScriptHash,
  Transaction,
} from '@emurgo/cardano-serialization-lib-nodejs';
import KoiosApi from './network/KoiosApi';
import { EventTrigger } from '../../models/Models';
import CardanoConfigs from './helpers/CardanoConfigs';
import { Utxo } from './models/Interfaces';
import CardanoUtils from './helpers/CardanoUtils';
import CardanoTransaction from './models/CardanoTransaction';
import ChainsConstants from '../ChainsConstants';
import Configs from '../../helpers/Configs';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../guard/MinimumFee';
import {
  FailedError,
  NetworkError,
  NotFoundError,
  UnexpectedApiError,
} from '../../helpers/errors';

const logger = loggerFactory(import.meta.url);

// TODO: include this class in refactor (#109)
class CardanoTxVerifier {
  static bankAddress = Address.from_bech32(CardanoConfigs.bankAddress);

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
        this.bankAddress.to_bech32()
      )
        return false;

    // verify all bank boxes have no metadata
    if (tx.auxiliary_data()) return false;

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

      return (
        paymentBox.amount().coin().compare(lovelacePaymentAmount) === 0 &&
        (sizeOfMultiAssets === undefined || sizeOfMultiAssets === 0) &&
        paymentBox.address().to_bech32() === event.toAddress
      );
    } else {
      // Token payment case
      const lovelacePaymentAmount: BigNum = CardanoConfigs.txMinimumLovelace;
      const assetPaymentAmount: BigNum = this.getPaymentAmount(
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
