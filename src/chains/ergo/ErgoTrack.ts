import { Address, ErgoBox, Transaction } from 'ergo-lib-wasm-nodejs';
import ExplorerApi from './network/ExplorerApi';
import ErgoConfigs from './helpers/ErgoConfigs';
import { JsonBI } from '../../network/NetworkModels';
import { dbAction } from '../../db/DatabaseAction';
import ChainsConstants from '../ChainsConstants';
import ErgoTransaction from './models/ErgoTransaction';
import ErgoUtils from './helpers/ErgoUtils';
import { BoxesAssets, CoveringErgoBoxes } from './models/Interfaces';
import { txAgreement } from '../../guard/agreement/TxAgreement';

// TODO: include this class in refactor (#109)
class ErgoTrack {
  static lockAddress = Address.from_base58(
    ErgoConfigs.ergoContractConfig.lockAddress
  );
  static lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress);

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

        const trackedBox =
          outputs.length > 0
            ? ErgoBox.from_json(JsonBI.stringify(outputs[0]))
            : undefined;
        inputs.forEach((input) => trackMap.set(input.boxId, trackedBox));
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
   * get lock boxes from explorer, track to last box and filter used ones
   * @param required required assets (erg and tokens)
   * @param trackBoxesMap mapping for track boxes
   * @param usedBoxIds list of used boxes
   */
  static getCoveringLockBoxes = async (
    required: BoxesAssets,
    trackBoxesMap: Map<string, ErgoBox | undefined>,
    usedBoxIds: string[]
  ): Promise<CoveringErgoBoxes> => {
    let uncoveredErg = required.ergs;
    const uncoveredTokens = new Map<string, bigint>();
    Object.entries(required.tokens).forEach(([tokenId, amount]) => {
      uncoveredTokens.set(tokenId, amount);
    });

    const remaining = () => {
      return uncoveredTokens.size > 0 || uncoveredErg > 0n;
    };

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
        if (!usedBoxIds.includes(box.boxId)) {
          // track the box using mempool and txQueue
          let lastBox = ErgoBox.from_json(JsonBI.stringify(box));
          while (trackBoxesMap.has(lastBox.box_id().to_str()))
            lastBox = trackBoxesMap.get(lastBox.box_id().to_str())!;

          if (
            !result.find(
              (box) => box.box_id().to_str() === lastBox.box_id().to_str()
            )
          ) {
            let isAdded = false;
            if (uncoveredTokens.size > 0) {
              for (const asset of box.assets) {
                const unCoveredAmount = uncoveredTokens.get(asset.tokenId);
                if (unCoveredAmount) {
                  if (unCoveredAmount <= asset.amount) {
                    uncoveredTokens.delete(asset.tokenId);
                  } else {
                    uncoveredTokens.set(
                      asset.tokenId,
                      unCoveredAmount - asset.amount
                    );
                  }
                  if (!isAdded) {
                    uncoveredErg -= box.value;
                    result.push(lastBox);
                  }
                  isAdded = true;
                }
              }
            }
            if (!isAdded && uncoveredErg > 0n) {
              uncoveredErg -= box.value;
              result.push(lastBox);
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

  /**
   * tracks lock boxes with mempool and tx queue and filter used boxes in unsigned txs of txAgreement and db
   * @param required required amount of erg and tokens
   */
  static trackAndFilterLockBoxes = async (
    required: BoxesAssets
  ): Promise<CoveringErgoBoxes> => {
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

    // get boxes and apply track and filter
    return this.getCoveringLockBoxes(required, trackBoxesMap, usedBoxIds);
  };
}

export default ErgoTrack;
