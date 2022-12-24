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
import ExplorerApi from './network/ExplorerApi';
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
import {
  Asset,
  Box,
  BoxesAssets,
  CoveringErgoBoxes,
} from './models/Interfaces';
import { txAgreement } from '../../guard/agreement/TxAgreement';

const logger = loggerFactory(import.meta.url);

class ErgoChain implements BaseChain<ReducedTransaction, ErgoTransaction> {
  lockAddress = Address.from_base58(ErgoConfigs.ergoContractConfig.lockAddress);
  lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);

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

    // get required boxes for transaction input
    const coveringBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
      this.lockErgoTree,
      requiredAssets.ergs + ErgoConfigs.minimumErg, // required amount of Erg plus minimumErg for change box
      requiredAssets.tokens
    );

    if (!coveringBoxes.covered) {
      const neededErgs = (
        requiredAssets.ergs + ErgoConfigs.minimumErg
      ).toString();
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

  /**
   * tracks lock boxes with mempool and tx queue and filter used ones
   * @param required required amount of erg and tokens
   */
  tractAndFilterLockBoxes = async (
    required: BoxesAssets
  ): Promise<CoveringErgoBoxes> => {
    let ergAmount = required.ergs;
    const tokens = { ...required.tokens };
    const remaining = () => {
      const isAnyTokenRemain = Object.entries(tokens)
        .map(([, amount]) => amount > 0)
        .reduce((a, b) => a || b, false);
      return isAnyTokenRemain || ergAmount > 0;
    };

    const trackBoxesMap = new Map<string, ErgoBox | undefined>();

    // generate mempool dictionary
    const mempoolTxs = await ExplorerApi.getMempoolTxsForAddress(
      ErgoConfigs.ergoContractConfig.lockAddress
    );
    if (mempoolTxs.total !== 0) {
      mempoolTxs.items.forEach((tx) => {
        const inputs = tx.inputs.filter(
          (box) => box.address === ErgoConfigs.ergoContractConfig.lockAddress
        );
        const outputs = tx.outputs.filter(
          (box) => box.address === ErgoConfigs.ergoContractConfig.lockAddress
        );
        if (inputs.length >= 1) {
          inputs.forEach((input) => {
            const box =
              outputs.length > 0
                ? ErgoBox.from_json(JsonBI.stringify(outputs[0]))
                : undefined;
            trackBoxesMap.set(input.boxId, box);
          });
        }
      });
    }

    // generate tx queue dictionary
    const dbSignedTxs = await dbAction.getSignedActiveTxsInChain(
      ChainsConstants.ergo
    );
    dbSignedTxs.forEach((txEntity) => {
      const ergoTx = ErgoTransaction.fromJson(txEntity.txJson);

      const inputBoxIds = ErgoUtils.getPaymentTxLockInputIds(
        ergoTx,
        this.lockErgoTree
      );
      const outputs = this.signedDeserialize(ergoTx.txBytes).outputs();
      for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i);
        const boxErgoTree = output.ergo_tree().to_base16_bytes();
        if (boxErgoTree === this.lockErgoTree) {
          inputBoxIds.forEach((inputId) => {
            trackBoxesMap.set(inputId, output);
          });
          break;
        }
      }
    });

    // get unsigned txs input boxes from database
    const dbUnsignedTxs = await dbAction.getUnsignedActiveTxsInChain(
      ChainsConstants.ergo
    );
    let filterBoxIds = dbUnsignedTxs.flatMap((txEntity) => {
      const ergoTx = ErgoTransaction.fromJson(txEntity.txJson);
      return ergoTx.inputBoxes
        .map((serializedBox) => {
          const box = ErgoBox.sigma_parse_bytes(serializedBox);
          if (box.ergo_tree().to_base16_bytes() === this.lockErgoTree)
            return box.box_id().to_str();
          else return '';
        })
        .filter((id) => id !== '');
    });

    // get unsigned txs input boxes from txAgreement
    const txAgreementUsedInputBoxes =
      txAgreement.getErgoPendingTransactionsInputs(this.lockErgoTree);
    filterBoxIds = filterBoxIds.concat(txAgreementUsedInputBoxes);

    // covering initialization
    const total = (
      await ExplorerApi.getBoxesForErgoTree(this.lockErgoTree, 0, 1)
    ).total;
    let offset = 0;

    // get lock boxes, track and filter
    const result: Box[] = [];
    while (offset < total && remaining()) {
      const boxes = await ExplorerApi.getBoxesForErgoTree(
        this.lockErgoTree,
        offset,
        10
      );
      for (const box of boxes.items) {
        if (filterBoxIds.find((id) => id === box.boxId)) {
          result.push(box);
          ergAmount -= box.value;
          box.assets.map((asset: Asset) => {
            if (Object.prototype.hasOwnProperty.call(tokens, asset.tokenId)) {
              tokens[asset.tokenId] -= asset.amount;
            }
          });
          if (!remaining()) break;
        }
      }
      offset += 10;
    }

    return {
      boxes: result.map((box) => ErgoBox.from_json(JsonBI.stringify(box))),
      covered: !remaining(),
    };
  };
}

export default ErgoChain;
