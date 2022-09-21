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
import { logger, logThrowError } from '../../log/Logger';

class Reward {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);

  static generateTransaction = async (
    event: EventTrigger
  ): Promise<ErgoTransaction> => {
    // get current height of network
    const currentHeight = await NodeApi.getHeight();

    // get eventBox and remaining valid commitments
    const eventBox: ErgoBox = await InputBoxes.getEventBox(event);
    const commitmentBoxes: ErgoBox[] =
      await InputBoxes.getEventValidCommitments(event);

    const rsnCoef = await InputBoxes.getRSNRatioCoef(event.sourceChainTokenId);

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
            ChainsConstants.cardano
          )
        : this.tokenEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            ChainsConstants.cardano
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
      const Erg = (requiredAssets.ergs + ErgoConfigs.minimumErg).toString();
      const Tokens = JsonBI.stringify(requiredAssets.tokens);
      logThrowError(
        `Bank boxes didn't cover required assets. Erg: ${Erg}, Tokens: ${Tokens}`
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
   * @return true if tx verified
   */
  static verifyTransactionWithEvent = async (
    paymentTx: ErgoTransaction,
    event: EventTrigger
  ): Promise<boolean> => {
    const tx = this.deserialize(paymentTx.txBytes).unsigned_tx();
    const outputBoxes = tx.output_candidates();

    // get current height of network (not important, just for creation of expected boxes)
    const currentHeight = await NodeApi.getHeight();

    // get eventBox and remaining valid commitments
    const eventBox: ErgoBox = await InputBoxes.getEventBox(event);
    const commitmentBoxes: ErgoBox[] =
      await InputBoxes.getEventValidCommitments(event);
    const rsnCoef = await InputBoxes.getRSNRatioCoef(event.sourceChainTokenId);
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
            ChainsConstants.cardano
          )
        : this.tokenEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            ChainsConstants.cardano
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
   * @return the generated reward reduced transaction
   */
  static ergEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (BigInt(event.bridgeFee) * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint =
      (BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent) /
        100n /
        BigInt(watchersLen) +
      ErgoConfigs.minimumErg;
    const watcherTokenAmount = 0n;
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint =
      BigInt(event.bridgeFee) - BigInt(watchersLen) * watcherErgAmount;
    const guardBridgeFeeTokenAmount = 0n;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount = BigInt(event.networkFee);
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
   * @return the generated reward reduced transaction
   */
  static tokenEventRewardBoxes = (
    event: EventTrigger,
    eventBox: ErgoBox,
    commitmentBoxes: ErgoBox[],
    rsnCoef: [bigint, bigint],
    currentHeight: number,
    paymentTokenId: string,
    network: string
  ): ErgoBoxCandidate[] => {
    const watchersLen: number = event.WIDs.length + commitmentBoxes.length;
    const rsnFee = (BigInt(event.bridgeFee) * rsnCoef[0]) / rsnCoef[1];

    // calculate assets of reward boxes
    const watcherErgAmount: bigint = ErgoConfigs.minimumErg;
    const watcherTokenAmount: bigint =
      (BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent) /
      100n /
      BigInt(watchersLen);
    const watcherRsnAmount: bigint =
      (rsnFee * ErgoConfigs.watchersRSNSharePercent) /
      100n /
      BigInt(watchersLen);
    const guardBridgeFeeErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardBridgeFeeTokenAmount: bigint =
      BigInt(event.bridgeFee) - BigInt(watchersLen) * watcherErgAmount;
    const guardRsnAmount: bigint =
      rsnFee - BigInt(watchersLen) * watcherRsnAmount;
    const guardNetworkErgAmount: bigint = ErgoConfigs.minimumErg;
    const guardNetworkTokenAmount = BigInt(event.networkFee);
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
}

export default Reward;
