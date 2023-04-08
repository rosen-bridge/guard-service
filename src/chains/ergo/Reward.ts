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
import {
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  NotFoundError,
} from '../../helpers/errors';
import ErgoTrack from './ErgoTrack';

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

    // get event payment transaction id
    const paymentTxId = await InputBoxes.getEventPaymentTransactionId(
      event.getId()
    );

    // create transaction output boxes
    const outBoxes =
      event.sourceChainTokenId === ChainsConstants.ergoNativeAsset
        ? OutputBoxes.ergEventRewardBoxes(
            event,
            eventBox,
            commitmentBoxes,
            rsnCoef,
            currentHeight,
            event.sourceChainTokenId,
            ChainsConstants.ergo,
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
            ChainsConstants.ergo,
            Utils.maxBigint(BigInt(event.bridgeFee), feeConfig.bridgeFee),
            Utils.maxBigint(BigInt(event.networkFee), feeConfig.networkFee),
            paymentTxId
          );

    // calculate required assets
    const outBoxesAssets = ErgoUtils.calculateBoxesAssets(outBoxes);
    const requiredAssets = ErgoUtils.reduceUsedAssets(
      outBoxesAssets,
      ErgoUtils.calculateBoxesAssets([eventBox, ...commitmentBoxes]),
      true
    );
    requiredAssets.ergs = requiredAssets.ergs + ErgoConfigs.minimumErg; // required amount of Erg plus minimumErg for change box

    // check if address contains required assets
    if (!(await ErgoTrack.hasLockAddressEnoughAssets(requiredAssets))) {
      const neededErgs = requiredAssets.ergs.toString();
      const neededTokens = JsonBI.stringify(requiredAssets.tokens);
      throw new NotEnoughAssetsError(
        `Lock boxes doesn't contain required assets. Erg: ${neededErgs}, Tokens: ${neededTokens}`
      );
    }

    // get required boxes for transaction input
    const coveringBoxes = await ErgoTrack.trackAndFilterLockBoxes(
      requiredAssets
    );

    if (!coveringBoxes.covered) {
      const neededErgs = requiredAssets.ergs.toString();
      const neededTokens = JsonBI.stringify(requiredAssets.tokens);
      throw new NotEnoughValidBoxesError(
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
      `Payment Transaction [${txId}] generated for event [${eventId}]`
    );
    return ergoTx;
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
}

export default Reward;
