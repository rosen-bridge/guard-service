import {
  DOGE_TX_BASE_SIZE,
  DOGE_INPUT_SIZE,
  DOGE_OUTPUT_SIZE,
  MINIMUM_UTXO_VALUE,
} from './constants';
import { DogeUtxo, BoxInfo, CoveringBoxes } from './types';

/**
 * Estimates the required fee for a Dogecoin transaction based on the number of inputs, outputs, and the current network fee per byte.
 * @param inputSize The number of inputs in the transaction
 * @param outputSize The number of outputs in the transaction
 * @param feePerByte The current network fee per byte
 * @returns The estimated fee as a BigInt
 */
export const estimateTxFee = (
  inputSize: number,
  outputSize: number,
  feePerByte: number
): bigint => {
  const inputSizeInBytes = inputSize * DOGE_INPUT_SIZE;
  const outputSizeInBytes = outputSize * DOGE_OUTPUT_SIZE;
  const txSizeInBytes =
    DOGE_TX_BASE_SIZE + inputSizeInBytes + outputSizeInBytes;
  return BigInt(Math.ceil(txSizeInBytes * feePerByte));
};

/**
 * Gets boxId from transaction input
 * @param txId The transaction ID
 * @param index The output index
 * @returns box id in `{txId}.{index}` format
 */
export const getInputBoxId = (txId: string, index: number): string => {
  return `${txId}.${index}`;
};

/**
 * Extracts box id and assets of a Dogecoin UTXO
 * @param utxo The Dogecoin UTXO
 * @returns An object containing the box id and assets
 */
export const getUtxoInfo = (utxo: DogeUtxo): BoxInfo => {
  return {
    id: `${utxo.txId}.${utxo.index}`,
    assets: {
      nativeToken: utxo.value,
      tokens: [],
    },
  };
};

/**
 * Selects Dogecoin UTXOs to cover the required amount plus estimated fees
 * @param requiredSatoshi the required DOGE in satoshi unit
 * @param forbiddenBoxIds the id of forbidden boxes
 * @param trackMap the mapping of a box id to its next box
 * @param utxoIterator a generator function to get utxo
 * @param feePerByte network fee per byte
 * @param logger
 * @returns an object containing the selected boxes with a boolean showing if requirements are covered or not
 */
export const selectDogeUtxos = async (
  requiredSatoshi: bigint,
  forbiddenBoxIds: Array<string>,
  trackMap: Map<string, DogeUtxo | undefined>,
  utxoIterator:
    | AsyncIterator<DogeUtxo, undefined>
    | Iterator<DogeUtxo, undefined>,
  feePerByte: number
): Promise<CoveringBoxes<DogeUtxo>> => {
  let uncoveredNativeToken = requiredSatoshi + estimateTxFee(0, 2, feePerByte);
  const selectedUtxos: Array<string> = [];

  const result: Array<DogeUtxo> = [];

  // get boxes until requirements are satisfied
  while (uncoveredNativeToken > 0n) {
    const iteratorResponse = await utxoIterator.next();

    // end process if there are no more boxes
    if (iteratorResponse.done) break;
    const box = iteratorResponse.value;

    let trackedBox: DogeUtxo | undefined = box;
    let boxInfo = getUtxoInfo(box);

    // track boxes
    let skipBox = false;
    while (trackMap.has(boxInfo.id)) {
      trackedBox = trackMap.get(boxInfo.id);
      if (!trackedBox) {
        skipBox = true;
        break;
      }
      const preId = boxInfo.id;
      boxInfo = getUtxoInfo(trackedBox);
    }

    // if tracked to no box or forbidden box, skip it
    if (
      skipBox ||
      forbiddenBoxIds.includes(boxInfo.id) ||
      selectedUtxos.includes(boxInfo.id)
    ) {
      continue;
    }

    // check if box value is sufficient
    if (boxInfo.assets.nativeToken < MINIMUM_UTXO_VALUE) {
      continue;
    }

    // check and add if box assets are useful to requirements
    result.push(trackedBox!);
    selectedUtxos.push(boxInfo.id);
    uncoveredNativeToken += estimateTxFee(1, 0, feePerByte);
    uncoveredNativeToken -=
      uncoveredNativeToken >= boxInfo.assets.nativeToken
        ? boxInfo.assets.nativeToken
        : uncoveredNativeToken;

    // end process if requirements are satisfied
    if (uncoveredNativeToken <= 0n) {
      break;
    }
  }

  return {
    covered: uncoveredNativeToken <= 0n,
    boxes: result,
  };
};
