import { PsbtTxInput } from 'bitcoinjs-lib';
import { DOGE_TX_BASE_SIZE } from './constants';
import { DOGE_INPUT_SIZE } from './constants';
import { DOGE_OUTPUT_SIZE } from './constants';
import { Psbt } from 'bitcoinjs-lib';

/**
 * gets boxId from PsbtTxInput
 * @param input
 * @returns box id in `{txId}.{index}` format
 */
export const getPsbtTxInputBoxId = (input: PsbtTxInput) =>
  `${input.hash.reverse().toString('hex')}.${input.index}`;

/**
 * estimates required fee for tx based on number of inputs, outputs and current network fee ratio
 * uses standard non-SegWit transaction size calculation
 * @param inputSize number of inputs
 * @param outputSize number of outputs
 * @param feeRatio fee rate in satoshis per byte
 */
export const estimateTxFee = (
  inputSize: number,
  outputSize: number,
  feeRatio: number,
): bigint => {
  const txSize =
    DOGE_TX_BASE_SIZE +
    inputSize * DOGE_INPUT_SIZE +
    outputSize * DOGE_OUTPUT_SIZE;

  return BigInt(Math.ceil(txSize * feeRatio));
};

/**
 * checks if a PSBT is finalized by attempting to extract the transaction
 * @param psbt the PSBT to check
 * @returns true if the PSBT is finalized
 */
export const isPsbtFinalized = (psbt: Psbt): boolean => {
  try {
    psbt.extractTransaction(true);
    return true;
  } catch {
    return false;
  }
};
