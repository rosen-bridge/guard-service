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
import Configs from '../../helpers/Configs';
import Utils from '../../helpers/Utils';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../event/MinimumFee';
import {
  NetworkError,
  FailedError,
  UnexpectedApiError,
  NotFoundError,
} from '../../helpers/errors';
import { ErgoNodeRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { AssetMap, BoxesAssets } from './models/Interfaces';

const logger = loggerFactory(import.meta.url);

class ErgoTxVerifier {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);
  static coldAddress = Address.from_base58(ErgoConfigs.coldAddress);
  static coldErgoTree = ErgoUtils.addressToErgoTreeString(this.coldAddress);
  static rosenExtractor = new ErgoNodeRosenExtractor(
    ErgoConfigs.ergoContractConfig.lockAddress,
    Configs.tokens(),
    logger
  );

  /**
   * verifies the payment transaction data with the event
   *  1. checks number of output boxes
   *  2. checks change box ergoTree
   *  3. checks assets, contracts and R4 of output boxes are same as the one we generated
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
    ) {
      logger.debug(`Tx [${paymentTx.txId}] invalid: Inputs aren't verified`);
      return false;
    }

    // verify number of output boxes (1 payment box + number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
    const outputLength = outputBoxes.len();
    const watchersLen = event.WIDs.length + commitmentBoxes.length;
    if (outputLength !== watchersLen + 5) {
      logger.debug(
        `Tx [${
          paymentTx.txId
        }] invalid: Found [${outputLength}] output boxes, Expected [${
          watchersLen + 5
        }] output boxes`
      );
      return false;
    }

    // verify change box address
    if (
      outputBoxes
        .get(outputLength - 2)
        .ergo_tree()
        .to_base16_bytes() !== this.lockErgoTree
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: ChangeBox ergoTree [${outputBoxes
          .get(outputLength - 2)
          .ergo_tree()
          .to_base16_bytes()}] is not equal to lock ergoTree [${
          this.lockErgoTree
        }]`
      );
      return false;
    }

    // get event payment transaction id
    //  in CHAIN to Ergo events, payment and reward txs are combined
    const paymentTxId = '';

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
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
            paymentTxId
          )
        : this.tokenEventOutBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
            paymentTxId
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
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: Guards and watchers boxes are made different`
      );
      return false;
    }

    // verify tx fee
    if (
      ErgoUtils.bigintFromBoxValue(outputBoxes.get(outputLength - 1).value()) >
      ErgoConfigs.txFee
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: Transaction fee [${outputBoxes
          .get(outputLength - 1)
          .value()
          .as_i64()
          .to_str()}] is more than maximum allowed fee [${ErgoConfigs.txFee}]`
      );
      return false;
    }

    // verify no token burned
    if (BoxVerifications.verifyNoTokenBurned(paymentTx.inputBoxes, outputBoxes))
      return true;
    else {
      logger.debug(`Tx [${paymentTx.txId}] invalid: Some tokens got burned`);
      return false;
    }
  };

  /**
   * verifies the cold storage transfer transaction
   *  1. checks number of output boxes
   *  2. checks cold box ergoTree
   *  3. checks change box ergoTree
   *  4. checks change box registers
   *  5. checks remaining amount of assets in lockAddress after tx
   *  6. checks transaction fee (last box erg value)
   * @param ergoTx the transfer transaction
   * @return true if tx verified
   */
  static verifyColdStorageTransaction = async (
    ergoTx: ErgoTransaction
  ): Promise<boolean> => {
    const tx = this.deserialize(ergoTx.txBytes).unsigned_tx();
    const outputBoxes = tx.output_candidates();

    // verify number of output boxes (1 cold box + 1 change box + 1 tx fee box)
    const outputLength = outputBoxes.len();
    if (outputLength !== 3) return false;

    // verify box addresses
    if (
      outputBoxes.get(0).ergo_tree().to_base16_bytes() !== this.coldErgoTree ||
      outputBoxes.get(1).ergo_tree().to_base16_bytes() !== this.lockErgoTree
    )
      return false;

    // verify change box registers (no register allowed)
    if (outputBoxes.get(1).register_value(4) !== undefined) return false;

    // calculate remaining amount of assets in lockAddress after tx
    const assets = await ExplorerApi.getAddressAssets(
      ErgoConfigs.ergoContractConfig.lockAddress
    );
    const lockAddressTokens: AssetMap = {};
    assets.tokens.forEach(
      (token) => (lockAddressTokens[token.tokenId] = token.amount)
    );
    const lockAddressAssets: BoxesAssets = {
      ergs: assets.nanoErgs,
      tokens: lockAddressTokens,
    };

    const outBoxesAssets = ErgoUtils.calculateBoxesAssets([
      outputBoxes.get(0),
      outputBoxes.get(2),
    ]);
    const remainingAssets = ErgoUtils.reduceUsedAssets(
      lockAddressAssets,
      outBoxesAssets
    );

    // verify remaining amount to be within thresholds
    const ergoAssets = Configs.thresholds()[ChainsConstants.ergo];
    const remainingTokenIds = Object.keys(remainingAssets.tokens);
    for (let i = 0; i < remainingTokenIds.length; i++) {
      const tokenId = remainingTokenIds[i];
      if (
        Object.prototype.hasOwnProperty.call(ergoAssets, tokenId) &&
        (remainingAssets.tokens[tokenId] < ergoAssets[tokenId].low ||
          remainingAssets.tokens[tokenId] > ergoAssets[tokenId].high)
      )
        return false;
    }
    if (
      remainingAssets.ergs < ergoAssets[ChainsConstants.ergoNativeAsset].low ||
      remainingAssets.ergs > ergoAssets[ChainsConstants.ergoNativeAsset].high
    )
      return false;

    // verify transaction fee value (last box erg value)
    return (
      BigInt(outputBoxes.get(2).value().as_i64().to_str()) <= ErgoConfigs.txFee
    );
  };

  /**
   * verifies the reward transaction data with the event
   *  1. checks number of output boxes
   *  2. checks change box ergoTree
   *  3. checks assets, contracts and R4 of output boxes are same as the one we generated
   *  4. checks transaction fee (last box erg value)
   *  5. checks assets of inputs are same as assets of output (no token burned)
   * @param paymentTx the payment transaction
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return true if tx verified
   */
  static verifyRewardTransactionWithEvent = async (
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
    ) {
      logger.debug(`Tx [${paymentTx.txId}] invalid: Inputs aren't verified`);
      return false;
    }

    // verify number of output boxes (number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
    const outputLength = outputBoxes.len();
    const watchersLen = event.WIDs.length + commitmentBoxes.length;
    if (outputLength !== watchersLen + 4) {
      logger.debug(
        `Tx [${
          paymentTx.txId
        }] invalid: Found [${outputLength}] output boxes, Expected [${
          watchersLen + 4
        }] output boxes`
      );
      return false;
    }

    // verify change box address
    if (
      outputBoxes
        .get(outputLength - 2)
        .ergo_tree()
        .to_base16_bytes() !== this.lockErgoTree
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: ChangeBox ergoTree [${outputBoxes
          .get(outputLength - 2)
          .ergo_tree()
          .to_base16_bytes()}] is not equal to lock ergoTree [${
          this.lockErgoTree
        }]`
      );
      return false;
    }

    // get event payment transaction id
    let paymentTxId = '';
    try {
      paymentTxId = await InputBoxes.getEventPaymentTransactionId(
        event.getId()
      );
    } catch (e) {
      if (e instanceof NotFoundError) {
        logger.info(
          `Rejected tx [${paymentTx.txId}]. Reason: Failed to get event payment transaction`
        );
        return false;
      } else throw e;
    }

    // verify reward boxes
    const expectedRewardBoxes =
      event.sourceChainTokenId === ChainsConstants.ergoNativeAsset
        ? OutputBoxes.ergEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            event.fromChain,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
            paymentTxId
          )
        : OutputBoxes.tokenEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            event.fromChain,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
            paymentTxId
          );

    const rewardBoxes: ErgoBoxCandidate[] = [];
    for (
      let i = 0;
      i < watchersLen + 2;
      i++ // watchers + 2 box for guards
    )
      rewardBoxes.push(outputBoxes.get(i));

    // verify guards boxes and watcher permit boxes conditions
    if (
      !BoxVerifications.verifyOutputBoxesList(
        rewardBoxes.sort(InputBoxes.compareTwoBoxCandidate),
        expectedRewardBoxes.sort(InputBoxes.compareTwoBoxCandidate)
      )
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: Guards and watchers boxes are made different`
      );
      return false;
    }

    // verify tx fee
    if (
      ErgoUtils.bigintFromBoxValue(outputBoxes.get(outputLength - 1).value()) >
      ErgoConfigs.txFee
    ) {
      logger.debug(
        `Tx [${paymentTx.txId}] invalid: Transaction fee [${outputBoxes
          .get(outputLength - 1)
          .value()}] is more than maximum allowed fee [${ErgoConfigs.txFee}]`
      );
      return false;
    }

    // verify no token burned
    if (BoxVerifications.verifyNoTokenBurned(paymentTx.inputBoxes, outputBoxes))
      return true;
    else {
      logger.debug(`Tx [${paymentTx.txId}] invalid: Some tokens got burned`);
      return false;
    }
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
   * @param paymentTxId payment transaction id
   * @return the generated reward reduced transaction
   */
  static ergEventOutBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    bridgeFee: bigint,
    networkFee: bigint,
    paymentTxId: string
  ): ErgoBoxCandidate[] => {
    // calculate assets of payemnt box
    const paymentErgAmount: bigint =
      BigInt(event.amount) - bridgeFee - networkFee;
    const paymentTokenAmount = 0n;
    const paymentTokenId = event.targetChainTokenId;

    // create output boxes
    const outBoxes: ErgoBoxCandidate[] = OutputBoxes.ergEventRewardBoxes(
      event,
      eventBox,
      commitmentBoxes,
      rsnCoef,
      currentHeight,
      paymentTokenId,
      event.fromChain,
      bridgeFee,
      networkFee,
      paymentTxId
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
   * @param paymentTxId payment transaction id
   * @return the generated reward reduced transaction
   */
  static tokenEventOutBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    bridgeFee: bigint,
    networkFee: bigint,
    paymentTxId: string
  ): ErgoBoxCandidate[] => {
    // calculate assets of payemnt box
    const paymentErgAmount: bigint = ErgoConfigs.minimumErg;
    const paymentTokenAmount: bigint =
      BigInt(event.amount) - bridgeFee - networkFee;
    const paymentTokenId = event.targetChainTokenId;

    // create output boxes
    const outBoxes: ErgoBoxCandidate[] = OutputBoxes.tokenEventRewardBoxes(
      event,
      eventBox,
      commitmentBoxes,
      rsnCoef,
      currentHeight,
      paymentTokenId,
      event.fromChain,
      bridgeFee,
      networkFee,
      paymentTxId
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
      const data = this.rosenExtractor.get(
        InputBoxes.explorerTxToNodeTx(paymentTx)
      );
      if (!data) {
        logger.info(
          `Event [${eventId}] is not valid, failed to extract rosen data from lock transaction`
        );
        return false;
      }
      if (
        event.fromChain == ChainsConstants.ergo &&
        event.toChain == data.toChain &&
        event.networkFee == data.networkFee &&
        event.bridgeFee == data.bridgeFee &&
        event.amount == data.amount &&
        event.sourceChainTokenId == data.sourceChainTokenId &&
        event.targetChainTokenId == data.targetChainTokenId &&
        event.sourceBlockId == paymentTx.blockId &&
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
}

export default ErgoTxVerifier;
