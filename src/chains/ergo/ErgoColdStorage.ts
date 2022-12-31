import {
  Address,
  BoxSelection,
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
import { AssetMap, BoxesAssets } from './models/Interfaces';
import NodeApi from './network/NodeApi';
import Utils from '../../helpers/Utils';
import ExplorerApi from './network/ExplorerApi';
import { JsonBI } from '../../network/NetworkModels';
import OutputBoxes from './boxes/OutputBoxes';
import { TransactionTypes } from '../../models/Models';
import { loggerFactory } from '../../log/Logger';
import Configs from '../../helpers/Configs';
import ChainsConstants from '../ChainsConstants';
import ErgoTrack from './ErgoTrack';

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

    // create the box arguments in tx builder
    const inBoxSelection = new BoxSelection(
      inErgoBoxes,
      new ErgoBoxAssetsDataList()
    );

    // create the transaction
    const tx = TxBuilder.new(
      inBoxSelection,
      outBoxCandidates,
      currentHeight,
      ErgoUtils.boxValueFromBigint(ErgoConfigs.txFee),
      this.lockAddress
    ).build();

    // create ReducedTransaction object
    const ctx = await NodeApi.getErgoStateContext();
    const reducedTx = ReducedTransaction.from_unsigned_tx(
      tx,
      inErgoBoxes,
      ErgoBoxes.empty(),
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
   * verifies the transfer transaction
   *  1. checks number of output boxes
   *  2. checks cold box ergoTree
   *  3. checks change box ergoTree
   *  4. checks change box registers
   *  5. checks remaining amount of assets in lockAddress after tx
   *  6. checks transaction fee (last box erg value)
   * @param ergoTx the transfer transaction
   * @return true if tx verified
   */
  static verifyTransaction = async (
    ergoTx: ErgoTransaction
  ): Promise<boolean> => {
    const tx = ErgoColdStorage.deserialize(ergoTx.txBytes).unsigned_tx();
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
