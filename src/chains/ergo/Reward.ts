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
  ReducedTransaction,
  Transaction,
  TxBuilder,
} from 'ergo-lib-wasm-nodejs';
import { EventTrigger, TransactionTypes } from '../../models/Models';
import ErgoConfigs from './helpers/ErgoConfigs';
import ExplorerApi from './network/ExplorerApi';
import ErgoUtils from './helpers/ErgoUtils';
import NodeApi from './network/NodeApi';
import ErgoTransaction from './models/ErgoTransaction';
import InputBoxes from './boxes/InputBoxes';
import OutputBoxes from './boxes/OutputBoxes';
import ChainsConstants from '../ChainsConstants';
import Utils from '../../helpers/Utils';
import BoxVerifications from './boxes/BoxVerifications';
import { JsonBI } from '../../network/NetworkModels';
import { loggerFactory } from '../../log/Logger';
import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../guard/MinimumFee';
import { NotEnoughAssetsError } from '../../helpers/errors';
import { BoxesAssets, CoveringErgoBoxes } from './models/Interfaces';
import { dbAction } from '../../db/DatabaseAction';
import { txAgreement } from '../../guard/agreement/TxAgreement';

const logger = loggerFactory(import.meta.url);

class Reward {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);

  /**
   * generates unsigned transaction to distribute rewards of the event from multi-sig address in ergo chain
   * @param event the event trigger model
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @return the generated payment transaction
   */
  static generateTransaction = async (
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
      event.sourceChainTokenId === ChainsConstants.ergoNativeAsset
        ? this.ergEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            ChainsConstants.ergo,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee)
          )
        : this.tokenEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            ChainsConstants.ergo,
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
    const coveringBoxes = await this.trackAndFilterLockBoxes(requiredAssets);

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
      TransactionTypes.reward
    );

    logger.info(
      `Payment Transaction [${txId}] for event [${eventId}] generated`
    );
    return ergoTx;
  };

  /**
   * verifies the reward transaction data with the event
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

    // verify number of output boxes (number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
    const outputLength = outputBoxes.len();
    const watchersLen = event.WIDs.length + commitmentBoxes.length;
    if (outputLength !== watchersLen + 4) return false;

    // verify change box address
    if (
      outputBoxes
        .get(outputLength - 2)
        .ergo_tree()
        .to_base16_bytes() !== this.lockErgoTree
    )
      return false;

    // verify reward boxes
    const expectedRewardBoxes =
      event.sourceChainTokenId === ChainsConstants.ergoNativeAsset
        ? this.ergEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            event.fromChain,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee)
          )
        : this.tokenEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            event.fromChain,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee)
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
    )
      return false;

    // verify tx fee
    if (
      ErgoUtils.bigintFromBoxValue(
        outputBoxes.get(outputLength - 1).value()
      ) !== ErgoConfigs.txFee
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
  static serialize = (tx: ReducedTransaction): Uint8Array => {
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
   * generates outputs of payment and reward distribution tx for an Erg-Distribution event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param paymentTokenId the payment token id
   * @param network
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @return the generated reward reduced transaction
   */
  static ergEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string,
    bridgeFee: bigint,
    networkFee: bigint
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (bridgeFee * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
        100n /
        BigInt(watchersLen) +
      ErgoConfigs.minimumErg;
    const watcherTokenAmount = 0n;
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint =
      bridgeFee - BigInt(watchersLen) * watcherErgAmount;
    const guardBridgeFeeTokenAmount = 0n;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount = networkFee;
    const guardNetworkTokenAmount = 0n;
    const wids: Uint8Array[] = [
      ...event.WIDs.map(Utils.hexStringToUint8Array),
      ...commitmentBoxes.map((box) => InputBoxes.getErgoBoxWID(box)),
    ];

    // create output boxes
    return OutputBoxes.createRewardDistributionBoxes(
      currentHeight,
      watcherErgAmount,
      watcherTokenAmount,
      watcherRsnAmount,
      guardBridgeFeeErgAmount,
      guardBridgeFeeTokenAmount,
      guardRsnAmount,
      guardNetworkErgAmount,
      guardNetworkTokenAmount,
      network,
      paymentTokenId,
      wids
    );
  };

  /**
   * generates outputs of payment and reward distribution tx for a Token-Distribution event in ergo chain
   * @param event the event trigger model
   * @param eventBox the event trigger box
   * @param commitmentBoxes the not-merged valid commitment boxes for the event
   * @param rsnCoef rsn fee ratio
   * @param currentHeight current height of blockchain
   * @param paymentTokenId the payment token id
   * @param network
   * @param bridgeFee event bridge fee
   * @param networkFee event network fee
   * @return the generated reward reduced transaction
   */
  static tokenEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string,
    bridgeFee: bigint,
    networkFee: bigint
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (bridgeFee * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint = ErgoConfigs.minimumErg;
    const watcherTokenAmount: bigint =
      (bridgeFee * ErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardBridgeFeeTokenAmount: bigint =
      bridgeFee - BigInt(watchersLen) * watcherErgAmount;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardNetworkTokenAmount = networkFee;
    const wids: Uint8Array[] = [
      ...event.WIDs.map(Utils.hexStringToUint8Array),
      ...commitmentBoxes.map((box) => InputBoxes.getErgoBoxWID(box)),
    ];

    // create output boxes
    return OutputBoxes.createRewardDistributionBoxes(
      currentHeight,
      watcherErgAmount,
      watcherTokenAmount,
      watcherRsnAmount,
      guardBridgeFeeErgAmount,
      guardBridgeFeeTokenAmount,
      guardRsnAmount,
      guardNetworkErgAmount,
      guardNetworkTokenAmount,
      network,
      paymentTokenId,
      wids
    );
  };

  // TODO: All methods below this line are code duplication. Need to remove with refactor (#109)
  /**
   * converts bytearray representation of the signed transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @return the transaction model in the chain library
   */
  static signedDeserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.sigma_parse_bytes(txBytes);
  };

  /**
   * generates mempool tx input dictionary to track boxes and append to trackMap
   * @param trackMap the dictionary to append to
   */
  static generateMempoolTrackMap = async (
    trackMap: Map<string, ErgoBox | undefined>
  ): Promise<void> => {
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
            trackMap.set(input.boxId, box);
          });
        }
      });
    }
  };

  /**
   * generates mempool tx input dictionary to track boxes and append to trackMap
   * @param trackMap the dictionary to append to
   */
  static generateTxQueueTrackMap = async (
    trackMap: Map<string, ErgoBox | undefined>
  ): Promise<void> => {
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
            trackMap.set(inputId, output);
          });
          break;
        }
      }
    });
  };

  /**
   * tracks lock boxes with mempool and tx queue and filter used ones
   * @param required required amount of erg and tokens
   */
  static trackAndFilterLockBoxes = async (
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
    await this.generateMempoolTrackMap(trackBoxesMap);

    // generate tx queue dictionary
    await this.generateTxQueueTrackMap(trackBoxesMap);

    // get unsigned txs input boxes from database
    const dbUnsignedTxs = await dbAction.getUnsignedActiveTxsInChain(
      ChainsConstants.ergo
    );
    let usedBoxIds = dbUnsignedTxs.flatMap((txEntity) =>
      ErgoUtils.getPaymentTxLockInputIds(
        ErgoTransaction.fromJson(txEntity.txJson),
        this.lockErgoTree
      )
    );

    // get unsigned txs input boxes from txAgreement
    const txAgreementUsedInputBoxes =
      txAgreement.getErgoPendingTransactionsInputs(this.lockErgoTree);
    usedBoxIds = usedBoxIds.concat(txAgreementUsedInputBoxes);

    // covering initialization
    const total = (
      await ExplorerApi.getBoxesForErgoTree(this.lockErgoTree, 0, 1)
    ).total;
    let offset = 0;

    // get lock boxes, track and filter
    const result: ErgoBox[] = [];
    while (offset < total && remaining()) {
      const boxes = await ExplorerApi.getBoxesForErgoTree(
        this.lockErgoTree,
        offset,
        10
      );
      for (const box of boxes.items) {
        // check if the box does NOT exist in usedBoxIds list
        if (!usedBoxIds.find((id) => id === box.boxId)) {
          // track the box using mempool and txQueue
          let lastBox = ErgoBox.from_json(JsonBI.stringify(box));
          while (trackBoxesMap.has(lastBox.box_id().to_str()))
            lastBox = trackBoxesMap.get(lastBox.box_id().to_str())!;

          if (
            !result.find(
              (box) => box.box_id().to_str() === lastBox.box_id().to_str()
            )
          ) {
            result.push(lastBox);
            ergAmount -= BigInt(lastBox.value().as_i64().to_str());
            for (let i = 0; i < lastBox.tokens().len(); i++) {
              const token = lastBox.tokens().get(i);
              if (
                Object.prototype.hasOwnProperty.call(
                  tokens,
                  token.id().to_str()
                )
              ) {
                tokens[token.id().to_str()] -= BigInt(
                  token.amount().as_i64().to_str()
                );
              }
            }
          }
          if (!remaining()) break;
        }
      }
      offset += 10;
    }

    return {
      boxes: result,
      covered: !remaining(),
    };
  };
}

export default Reward;
