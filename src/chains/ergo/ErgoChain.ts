import {
  Address,
  BoxSelection,
  DataInput,
  DataInputs,
  ErgoBox,
  ErgoBoxAssetsDataList,
  ErgoBoxCandidate,
  ErgoBoxCandidates,
  ErgoBoxes,
  Transaction,
  ReducedTransaction,
  TxBuilder,
} from 'ergo-lib-wasm-nodejs';
import {
  EventTrigger,
  PaymentTransaction,
  TransactionStatus,
  TransactionTypes,
} from '../../models/Models';
import BaseChain from '../BaseChains';
import ErgoConfigs from './helpers/ErgoConfigs';
import ErgoUtils from './helpers/ErgoUtils';
import NodeApi from './network/NodeApi';
import ErgoTransaction from './models/ErgoTransaction';
import { dbAction } from '../../db/DatabaseAction';
import InputBoxes from './boxes/InputBoxes';
import OutputBoxes from './boxes/OutputBoxes';
import ChainsConstants from '../ChainsConstants';
import Reward from './Reward';
import MultiSigHandler from '../../guard/multisig/MultiSig';
import Configs from '../../helpers/Configs';
import Utils from '../../helpers/Utils';
import { JsonBI } from '../../network/NetworkModels';
import { guardConfig } from '../../helpers/GuardConfig';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../guard/MinimumFee';
import { NotEnoughAssetsError } from '../../helpers/errors';
import ErgoTrack from './ErgoTrack';

const logger = loggerFactory(import.meta.url);

class ErgoChain implements BaseChain<ReducedTransaction, ErgoTransaction> {
  lockAddress = Address.from_base58(ErgoConfigs.ergoContractConfig.lockAddress);

  /**
   * generates unsigned transaction of the event from multi-sig address in ergo chain
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  generateTransaction = async (
    event: EventTrigger,
    feeConfig: Fee
  ): Promise<ErgoTransaction> => {
    // get current height of network
    const currentHeight = await NodeApi.getHeight();

    // get eventBox and remaining valid commitments
    const eventBox: ErgoBox = await InputBoxes.getEventBox(event);
    const commitmentBoxes: ErgoBox[] =
      await InputBoxes.getEventValidCommitments(event);

    const rsnCoef: [bigint, bigint] = [
      feeConfig.rsnRatio,
      MinimumFee.bridgeMinimumFee.ratioDivisor,
    ];

    // create transaction output boxes
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

    // calculate required assets
    const outBoxesAssets = ErgoUtils.calculateBoxesAssets(outBoxes);
    const requiredAssets = ErgoUtils.reduceUsedAssets(
      outBoxesAssets,
      ErgoUtils.calculateBoxesAssets([eventBox, ...commitmentBoxes]),
      true
    );
    requiredAssets.ergs = requiredAssets.ergs + ErgoConfigs.minimumErg; // required amount of Erg plus minimumErg for change box

    // get required boxes for transaction input
    const coveringBoxes = await ErgoTrack.trackAndFilterLockBoxes(
      requiredAssets
    );

    if (!coveringBoxes.covered) {
      const neededErgs = requiredAssets.ergs.toString();
      const neededTokens = JsonBI.stringify(requiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Bank boxes didn't cover required assets. Erg: ${neededErgs}, Tokens: ${neededTokens}`
      );
    }

    // calculate input boxes and assets
    const inBoxes = [eventBox, ...commitmentBoxes, ...coveringBoxes.boxes];
    const inBoxesAssets = ErgoUtils.calculateBoxesAssets(inBoxes);
    const inErgoBoxes = ErgoBoxes.empty();
    inBoxes.forEach((box) => inErgoBoxes.add(box));

    // create change box and add to outBoxes
    outBoxes.push(
      OutputBoxes.createChangeBox(
        currentHeight,
        ErgoConfigs.ergoContractConfig.lockAddress,
        inBoxesAssets,
        outBoxesAssets,
        ErgoConfigs.txFee
      )
    );

    // get guards info box
    const guardInfoBox = await InputBoxes.getGuardsInfoBox();

    // create the box arguments in tx builder
    const inBoxSelection = new BoxSelection(
      inErgoBoxes,
      new ErgoBoxAssetsDataList()
    );
    const outBoxCandidates = ErgoBoxCandidates.empty();
    outBoxes.forEach((box) => outBoxCandidates.add(box));
    const dataInputs = new DataInputs();
    dataInputs.add(new DataInput(guardInfoBox.box_id()));

    // create the transaction
    const txCandidate = TxBuilder.new(
      inBoxSelection,
      outBoxCandidates,
      currentHeight,
      ErgoUtils.boxValueFromBigint(ErgoConfigs.txFee),
      this.lockAddress
    );
    txCandidate.set_data_inputs(dataInputs);
    const tx = txCandidate.build();

    // create ReducedTransaction object
    const ctx = await NodeApi.getErgoStateContext();
    const reducedTx = ReducedTransaction.from_unsigned_tx(
      tx,
      inErgoBoxes,
      new ErgoBoxes(guardInfoBox),
      ctx
    );

    // create PaymentTransaction object
    const txBytes = this.serialize(reducedTx);
    const txId = reducedTx.unsigned_tx().id().to_str();
    const eventId = event.getId();
    const ergoTx = new ErgoTransaction(
      txId,
      eventId,
      txBytes,
      inBoxes.map((box) => box.sigma_serialize_bytes()),
      [guardInfoBox].map((box) => box.sigma_serialize_bytes()),
      TransactionTypes.payment
    );

    logger.info(
      `Payment Transaction with txId:${txId} for event:${eventId} generated`
    );
    return ergoTx;
  };

  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  serialize = (tx: ReducedTransaction | Transaction): Uint8Array => {
    return tx.sigma_serialize_bytes();
  };

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  deserialize = (txBytes: Uint8Array): ReducedTransaction => {
    return ReducedTransaction.sigma_parse_bytes(txBytes);
  };

  /**
   * converts the signed transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @return bytearray representation of the transaction
   */
  signedSerialize = (tx: Transaction): Uint8Array => {
    return tx.sigma_serialize_bytes();
  };

  /**
   * converts bytearray representation of the signed transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  signedDeserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.sigma_parse_bytes(txBytes);
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
  ergEventOutBoxes = (
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
  tokenEventOutBoxes = (
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
   * requests Multisig service to sign an ergo transaction
   * @param paymentTx the transaction
   */
  requestToSignTransaction = async (
    paymentTx: PaymentTransaction
  ): Promise<void> => {
    const tx = this.deserialize(paymentTx.txBytes);
    const ergoTx = paymentTx as ErgoTransaction;
    const txInputs = ergoTx.inputBoxes.map((boxBytes) =>
      ErgoBox.sigma_parse_bytes(boxBytes)
    );
    const txDataInputs = ergoTx.dataInputs.map((boxBytes) =>
      ErgoBox.sigma_parse_bytes(boxBytes)
    );

    // change tx status to inSign
    await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.inSign);

    // send tx to sign
    MultiSigHandler.getInstance(guardConfig.publicKeys, Configs.guardSecret)
      .sign(tx, guardConfig.requiredSign, txInputs, txDataInputs)
      .then(async (signedTx) => {
        const inputBoxes = ErgoBoxes.empty();
        txInputs.forEach((box) => inputBoxes.add(box));

        // update database
        const signedPaymentTx = new ErgoTransaction(
          ergoTx.txId,
          ergoTx.eventId,
          this.signedSerialize(signedTx),
          ergoTx.inputBoxes,
          ergoTx.dataInputs,
          ergoTx.txType
        );
        await dbAction.updateWithSignedTx(
          ergoTx.txId,
          signedPaymentTx.toJson()
        );
        logger.info(`Ergo tx [${ergoTx.txId}] signed successfully`);
      })
      .catch(async (e) => {
        logger.info(
          `An error occurred while requesting Multisig service to sign Ergo tx: ${e}`
        );
        await dbAction.setTxStatus(
          paymentTx.txId,
          TransactionStatus.signFailed
        );
      });
  };

  /**
   * submit an ergo transaction to network
   * @param paymentTx the payment transaction
   */
  submitTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
    const tx = this.signedDeserialize(paymentTx.txBytes);
    try {
      await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.sent);
      const response = await NodeApi.sendTx(tx.to_json());
      logger.info(`Ergo Transaction submitted: [${response}]`);
    } catch (e) {
      logger.warn(`An error occurred while submitting Ergo transaction: ${e}`);
    }
  };
}

export default ErgoChain;
