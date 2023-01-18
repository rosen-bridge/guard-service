import {
  Address,
  ErgoBox,
  ErgoBoxCandidate,
  Transaction,
  ReducedTransaction,
} from 'ergo-lib-wasm-nodejs';
import { EventTrigger } from '../../models/Models';
import ErgoConfigs from './helpers/ErgoConfigs';
import ExplorerApi from './network/ExplorerApi';
import ErgoUtils from './helpers/ErgoUtils';
import NodeApi from './network/NodeApi';
import BoxVerifications from './boxes/BoxVerifications';
import ErgoTransaction from './models/ErgoTransaction';
import InputBoxes from './boxes/InputBoxes';
import OutputBoxes from './boxes/OutputBoxes';
import ChainsConstants from '../ChainsConstants';
import Reward from './Reward';
import Configs from '../../helpers/Configs';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../guard/MinimumFee';
import {
  NetworkError,
  FailedError,
  UnexpectedApiError,
  NotFoundError,
} from '../../helpers/errors';

const logger = loggerFactory(import.meta.url);

class ErgoTxVerifier {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);

  /**
   * verifies the payment transaction data with the event
   *  1. checks number of output boxes
   *  2. checks change box ergoTree
   *  3. checks assets, contracts and R4 of output boxes (expect last two) are same as the one we generated
   *  4. checks transaction fee (last box erg value)
   *  5. checks assets of inputs are same as assets of output (no token burned)
   * @param paymentTx the payment transaction
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return true if tx verified
   */
  static verifyTransactionWithEvent = async (
    paymentTx: ErgoTransaction,
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<boolean> => {
    const tx = this.deserialize(paymentTx.txBytes).unsigned_tx();
    const outputBoxes = tx.output_candidates();

    // get current height of network (not important, just for creation of expected boxes)
    const currentHeight = await NodeApi.getHeight();

    // get eventBox and remaining valid commitments
    const eventBox: ErgoBox = await InputBoxes.getEventBox(event);
    const commitmentBoxes: ErgoBox[] =
      await InputBoxes.getEventValidCommitments(event);
    const rsnCoef: [bigint, bigint] = [
      feeConfig.rsnRatio,
      MinimumFee.bridgeMinimumFee.ratioDivisor,
    ];
    if (
      !BoxVerifications.verifyInputs(
        tx.inputs(),
        eventBox,
        commitmentBoxes,
        paymentTx.inputBoxes
      )
    )
      return false;

    // verify number of output boxes (1 payment box + number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
    const outputLength = outputBoxes.len();
    const watchersLen = event.WIDs.length + commitmentBoxes.length;
    if (outputLength !== watchersLen + 5) return false;

    // verify change box address
    if (
      outputBoxes
        .get(outputLength - 2)
        .ergo_tree()
        .to_base16_bytes() !== this.lockErgoTree
    )
      return false;

    // verify payment box + reward boxes
    const outBoxes =
      event.targetChainTokenId === ChainsConstants.ergoNativeAsset
        ? this.ergEventOutBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee)
          )
        : this.tokenEventOutBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee)
          );

    const rewardBoxes: ErgoBoxCandidate[] = [];
    for (
      let i = 0;
      i < watchersLen + 3;
      i++ // 1 payment box + watchers + 2 box for guards
    )
      rewardBoxes.push(outputBoxes.get(i));

    // verify guards boxes and watcher permit boxes conditions
    if (
      !BoxVerifications.verifyOutputBoxesList(
        rewardBoxes.sort(InputBoxes.compareTwoBoxCandidate),
        outBoxes.sort(InputBoxes.compareTwoBoxCandidate)
      )
    )
      return false;

    // verify tx fee
    if (
      ErgoUtils.bigintFromBoxValue(outputBoxes.get(outputLength - 1).value()) >
      ErgoConfigs.txFee
    )
      return false;

    // verify no token burned
    return BoxVerifications.verifyNoTokenBurned(
      paymentTx.inputBoxes,
      outputBoxes
    );
  };

  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  static serialize = (tx: ReducedTransaction | Transaction): Uint8Array => {
    return tx.sigma_serialize_bytes();
  };

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  static deserialize = (txBytes: Uint8Array): ReducedTransaction => {
    return ReducedTransaction.sigma_parse_bytes(txBytes);
  };

  /**
   * generates unsigned transaction (to pay Erg) payment and reward of the event from multi-sig address in ergo chain
   * generates outputs of payment and reward distribution tx for an Erg-Payment event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @return the generated reward reduced transaction
   */
  static ergEventOutBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    bridgeFee: bigint,
    networkFee: bigint
  ): ErgoBoxCandidate[] => {
    // calculate assets of payemnt box
    const paymentErgAmount: bigint =
      BigInt(event.amount) - bridgeFee - networkFee;
    const paymentTokenAmount = 0n;
    const paymentTokenId = event.targetChainTokenId;

    // create output boxes
    const outBoxes: ErgoBoxCandidate[] = Reward.ergEventRewardBoxes(
      event,
      eventBox,
      commitmentBoxes,
      rsnCoef,
      currentHeight,
      paymentTokenId,
      event.fromChain,
      bridgeFee,
      networkFee
    );
    const paymentBox = OutputBoxes.createPaymentBox(
      currentHeight,
      event.toAddress,
      paymentErgAmount,
      paymentTokenId,
      paymentTokenAmount
    );

    return [...outBoxes, paymentBox];
  };

  /**
   * generates outputs of payment and reward distribution tx for a Token-Payment event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @return the generated reward reduced transaction
   */
  static tokenEventOutBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    bridgeFee: bigint,
    networkFee: bigint
  ): ErgoBoxCandidate[] => {
    // calculate assets of payemnt box
    const paymentErgAmount: bigint = ErgoConfigs.minimumErg;
    const paymentTokenAmount: bigint =
      BigInt(event.amount) - bridgeFee - networkFee;
    const paymentTokenId = event.targetChainTokenId;

    // create output boxes
    const outBoxes: ErgoBoxCandidate[] = Reward.tokenEventRewardBoxes(
      event,
      eventBox,
      commitmentBoxes,
      rsnCoef,
      currentHeight,
      paymentTokenId,
      event.fromChain,
      bridgeFee,
      networkFee
    );
    const paymentBox = OutputBoxes.createPaymentBox(
      currentHeight,
      event.toAddress,
      paymentErgAmount,
      paymentTokenId,
      paymentTokenAmount
    );

    return [...outBoxes, paymentBox];
  };

  /**
   * verified the event payment in the Ergo
   * conditions that checks:
   *  1- having atLeast 1 asset in the first output of the transaction
   *  2- the asset should be listed on the tokenMap config
   *  3- R4 should have length at least
   * @param event
   * @param RWTId
   */
  static verifyEventWithPayment = async (
    event: EventTrigger,
    RWTId: string
  ): Promise<boolean> => {
    const eventId = Utils.txIdToEventId(event.sourceTxId);
    // Verifying watcher RWTs
    if (RWTId !== ErgoConfigs.ergoContractConfig.RWTId) {
      logger.info(
        `event [${eventId}] is not valid, event RWT is not compatible with the ergo RWT id`
      );
      return false;
    }
    try {
      const paymentTx = await ExplorerApi.getConfirmedTx(event.sourceTxId);
      const lockAddress = ErgoConfigs.ergoContractConfig.lockAddress;
      const payment = paymentTx.outputs
        .filter((box) => lockAddress === box.address)
        .map((box) => ErgoUtils.getRosenData(box, event.sourceChainTokenId))
        .filter((box) => box !== undefined)[0];
      if (payment) {
        const token = Configs.tokenMap.search(ChainsConstants.ergo, {
          [Configs.tokenMap.getIdKey(ChainsConstants.ergo)]:
            event.sourceChainTokenId,
        });
        let targetTokenId;
        try {
          targetTokenId = Configs.tokenMap.getID(token[0], event.toChain);
        } catch (e) {
          logger.info(
            `Event [${eventId}] is not valid,tx [${event.sourceTxId}] token or chainId is invalid`
          );
          return false;
        }
        if (
          event.fromChain == ChainsConstants.ergo &&
          event.toChain == payment.toChain &&
          event.networkFee == payment.networkFee &&
          event.bridgeFee == payment.bridgeFee &&
          event.amount == payment.amount &&
          event.sourceChainTokenId == payment.tokenId &&
          event.targetChainTokenId == targetTokenId &&
          event.sourceBlockId == payment.blockId &&
          event.toAddress == payment.toAddress &&
          event.fromAddress == payment.fromAddress
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
          `Event [${eventId}] is not valid, failed to extract Rosen data from lock tx [${event.sourceTxId}]`
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
}

export default ErgoTxVerifier;
