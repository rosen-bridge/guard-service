import { PsbtTxInput } from 'bitcoinjs-lib';
import {
  SEGWIT_INPUT_WEIGHT_UNIT,
  SEGWIT_OUTPUT_WEIGHT_UNIT,
} from './constants';

/**
 * gets boxId from PsbtTxInput
 * @param input
 * @returns box id in `{txId}.{index}` format
 */
export const getPsbtTxInputBoxId = (input: PsbtTxInput) =>
  `${input.hash.reverse().toString('hex')}.${input.index}`;

/**
 * estimates required fee for tx based on number of inputs, outputs and current network fee ratio
 * inputs and outputs required fee are estimated by segwit weight unit
 * @param inputSize
 * @param outputSize
 * @param feeRatio
 */
export const estimateTxFee = (
  inputSize: number,
  outputSize: number,
  feeRatio: number,
): bigint => {
  const txBaseWeight = 40 + 2; // all txs include 40W. P2WPKH txs need additional 2W
  const inputsWeight = inputSize * SEGWIT_INPUT_WEIGHT_UNIT;
  const outputWeight = outputSize * SEGWIT_OUTPUT_WEIGHT_UNIT;
  return BigInt(
    Math.ceil(
      ((txBaseWeight + inputsWeight + outputWeight) / 4) * // estimate tx weight and convert to virtual size
        feeRatio,
    ),
  );
};
