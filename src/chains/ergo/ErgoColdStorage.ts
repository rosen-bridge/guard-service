import {
  Address,
  BoxSelection,
  DataInput,
  DataInputs,
  ErgoBoxAssetsDataList,
  ErgoBoxCandidates,
  ErgoBoxes,
  ReducedTransaction,
  Transaction,
  TxBuilder,
} from 'ergo-lib-wasm-nodejs';
import ErgoConfigs from './helpers/ErgoConfigs';
import ErgoUtils from './helpers/ErgoUtils';
import ErgoTransaction from './models/ErgoTransaction';
import { BoxesAssets } from './models/Interfaces';
import NodeApi from './network/NodeApi';
import Utils from '../../helpers/Utils';
import { JsonBI } from '../../network/NetworkModels';
import OutputBoxes from './boxes/OutputBoxes';
import { TransactionTypes } from '../../models/Models';
import { loggerFactory } from '../../log/Logger';
import ErgoTrack from './ErgoTrack';
import InputBoxes from './boxes/InputBoxes';

const logger = loggerFactory(import.meta.url);

class ErgoColdStorage {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);
  static coldAddress = Address.from_base58(ErgoConfigs.coldAddress);
  static coldErgoTree = ErgoUtils.addressToErgoTreeString(this.coldAddress);

  /**
   * generates unsigned transaction to transfer assets to cold storage in ergo chain
   * @return the generated asset transfer transaction
   */
  static generateTransaction = async (
    transferringAssets: BoxesAssets
  ): Promise<ErgoTransaction> => {
    // get current height of network
    const currentHeight = await NodeApi.getHeight();

    // add two minimum erg and txFee if current transferring ergs is less than that
    const requiredAssets: BoxesAssets = {
      ergs: Utils.maxBigint(
        transferringAssets.ergs,
        ErgoConfigs.minimumErg * 2n + ErgoConfigs.txFee
      ),
      tokens: transferringAssets.tokens,
    };

    // get required boxes for transaction input
    const coveringBoxes = await ErgoTrack.trackAndFilterLockBoxes(
      requiredAssets
    );

    if (!coveringBoxes.covered) {
      const neededErgs = requiredAssets.ergs.toString();
      const neededTokens = JsonBI.stringify(requiredAssets.tokens);
      throw new Error(
        `Bank boxes didn't cover required assets. Erg: ${neededErgs}, Tokens: ${neededTokens}`
      );
    }

    // create output boxes
    const coldBoxAssets: BoxesAssets = {
      ergs: requiredAssets.ergs - ErgoConfigs.minimumErg - ErgoConfigs.txFee,
      tokens: requiredAssets.tokens,
    };
    const coldBox = OutputBoxes.createColdBox(currentHeight, coldBoxAssets);

    const coveringAssets = ErgoUtils.calculateBoxesAssets(coveringBoxes.boxes);
    const changeBox = OutputBoxes.createChangeBox(
      currentHeight,
      ErgoConfigs.ergoContractConfig.lockAddress,
      coveringAssets,
      coldBoxAssets,
      ErgoConfigs.txFee
    );

    // calculate input and output boxes
    const inBoxes = coveringBoxes.boxes;
    const inErgoBoxes = ErgoBoxes.empty();
    inBoxes.forEach((box) => inErgoBoxes.add(box));

    const outBoxCandidates = ErgoBoxCandidates.empty();
    outBoxCandidates.add(coldBox);
    outBoxCandidates.add(changeBox);

    // get guards info box
    const guardInfoBox = await InputBoxes.getGuardsInfoBox();

    // create the box arguments in tx builder
    const inBoxSelection = new BoxSelection(
      inErgoBoxes,
      new ErgoBoxAssetsDataList()
    );
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

    // create ErgoTransaction object
    const txBytes = ErgoColdStorage.serialize(reducedTx);
    const txId = reducedTx.unsigned_tx().id().to_str();
    const ergoTx = new ErgoTransaction(
      txId,
      '',
      txBytes,
      inBoxes.map((box) => box.sigma_serialize_bytes()),
      [],
      TransactionTypes.coldStorage
    );

    logger.info(`Ergo coldStorage Transaction with txId [${txId}] generated`);
    return ergoTx;
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
}

export default ErgoColdStorage;
