import {
  SEGWIT_INPUT_WEIGHT_UNIT,
  SEGWIT_OUTPUT_WEIGHT_UNIT,
} from '@rosen-chains/bitcoin';
import { OP_RETURN_OPCODE, TAPROOT_OUTPUT_WEIGHT_UNIT } from './constants';
import { Psbt, Transaction } from 'bitcoinjs-lib';
import { ImpossibleBehavior } from '@rosen-chains/abstract-chain';
import { BitcoinRunesUtxo } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { FeeEstimator } from '@rosen-bridge/abstract-box-selection';

/**
 * generates asset id from block and tx index
 * @param block
 * @param txIndex
 */
export const generateAssetId = (
  block: number | bigint,
  txIndex: number | bigint
) => `${block}:${txIndex}`;

/**
 * estimates the virtual size of the transaciton based on the number of inputs, OP_RETURN output script, number of native segwit and taproot outputs
 * @param inputSize
 * @param opReturnScriptLength
 * @param nativeSegwitOutputSize
 * @param taprootOutputSize
 */
export const estimateTxVsize = (
  inputSize: number,
  opReturnScriptLength: number,
  nativeSegwitOutputSize: number,
  taprootOutputSize: number
): number => {
  const txBaseWeight = 40 + 2; // all txs include 40W. P2WPKH txs need additional 2W
  const opReturnWeightUnit =
    36 + // OP_RETURN base output weight
    opReturnScriptLength * 4; // OP_RETURN output data counts as vSize, so weight = script length * 4
  const inputsWeight = inputSize * SEGWIT_INPUT_WEIGHT_UNIT;
  const outputWeight =
    nativeSegwitOutputSize * SEGWIT_OUTPUT_WEIGHT_UNIT +
    taprootOutputSize * TAPROOT_OUTPUT_WEIGHT_UNIT;

  return (txBaseWeight + inputsWeight + opReturnWeightUnit + outputWeight) / 4;
};

/**
 * generates fee estimator for tx based on the psbt
 *
 * NOTE: this function only checks the script of the first output to determine if it is native segwit (otherwise assumes it is taproot)
 * and assumes that all other non-OP_RETURN outputs are native segwit
 * @param psbt
 * @param feeRatio
 */
export const generateFeeEstimatorWithPsbt = (
  psbt: Psbt,
  feeRatio: number
): FeeEstimator<BitcoinRunesUtxo> => {
  const isFirstOutputNativeSegwit = psbt.txOutputs[0].script
    .toString('hex')
    .startsWith('0014');
  const opReturnOutputs = psbt.txOutputs.filter((output) =>
    output.script.toString('hex').startsWith(OP_RETURN_OPCODE)
  );
  if (opReturnOutputs.length > 1)
    throw new ImpossibleBehavior(
      `Tx [${Transaction.fromBuffer(
        psbt.data.getTransaction()
      ).getId()}] has more than one (${
        opReturnOutputs.length
      }) OP_RETURN output`
    );
  if (opReturnOutputs.length === 0)
    throw new ImpossibleBehavior(
      `Tx [${Transaction.fromBuffer(
        psbt.data.getTransaction()
      ).getId()}] has no OP_RETURN output`
    );
  const opReturnScriptLength = opReturnOutputs[0].script.length;

  return generateFeeEstimatorWithAssumptions(
    isFirstOutputNativeSegwit,
    opReturnScriptLength,
    feeRatio
  );
};

/**
 * generates fee estimator for tx based on the OP_RETURN data lenght and type of the first output
 * @param isFirstOutputNativeSegwit
 * @param opReturnScriptLength
 * @param feeRatio
 */
export const generateFeeEstimatorWithAssumptions = (
  isFirstOutputNativeSegwit: boolean,
  opReturnScriptLength: number,
  feeRatio: number
): FeeEstimator<BitcoinRunesUtxo> => {
  return (
    selectedBoxes: Array<BitcoinRunesUtxo>,
    changeBoxesCount: number
  ): bigint => {
    const estimatedVsize = isFirstOutputNativeSegwit
      ? estimateTxVsize(
          selectedBoxes.length,
          opReturnScriptLength,
          changeBoxesCount + 1,
          0
        )
      : estimateTxVsize(
          selectedBoxes.length,
          opReturnScriptLength,
          changeBoxesCount,
          1
        );
    return BigInt(Math.ceil(estimatedVsize * feeRatio));
  };
};
