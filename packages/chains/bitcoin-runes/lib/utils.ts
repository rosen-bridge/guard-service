import {
  SEGWIT_INPUT_WEIGHT_UNIT,
  SEGWIT_OUTPUT_WEIGHT_UNIT,
} from '@rosen-chains/bitcoin';
import {
  NATIVE_SEGWIT_SCRIPT_PREFIX,
  OP_RETURN_OPCODE,
  TAPROOT_OUTPUT_WEIGHT_UNIT,
  TAPROOT_SCRIPT_PREFIX,
} from './constants';
import { Psbt, PsbtTxOutput, Transaction } from 'bitcoinjs-lib';
import {
  AssetBalance,
  ImpossibleBehavior,
  PaymentOrder,
  SinglePayment,
} from '@rosen-chains/abstract-chain';
import { BitcoinRunesUtxo } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { FeeEstimator } from '@rosen-bridge/abstract-box-selection';
import JsonBigInt from '@rosen-bridge/json-bigint';

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
const estimateTxVsize = (
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
 * NOTE: this function only checks the script of the first output after OP_RETURN to determine if it is native segwit (otherwise assumes it is taproot)
 * and assumes that all other non-OP_RETURN outputs are native segwit
 * @param psbt
 * @param feeRatio
 */
export const generateFeeEstimatorWithPsbt = (
  psbt: Psbt,
  feeRatio: number
): FeeEstimator<BitcoinRunesUtxo> => {
  const txId = Transaction.fromBuffer(psbt.data.getTransaction()).getId();

  const nativeSegwitOutputs: PsbtTxOutput[] = [];
  const taprootOutputs: PsbtTxOutput[] = [];
  const opReturnOutputs: PsbtTxOutput[] = [];

  psbt.txOutputs.forEach((output) => {
    const script = output.script.toString('hex');
    if (script.startsWith(NATIVE_SEGWIT_SCRIPT_PREFIX)) {
      nativeSegwitOutputs.push(output);
    } else if (script.startsWith(TAPROOT_SCRIPT_PREFIX)) {
      taprootOutputs.push(output);
    } else if (script.startsWith(OP_RETURN_OPCODE)) {
      opReturnOutputs.push(output);
    } else
      throw new ImpossibleBehavior(
        `Tx [${txId}] has an output with unexpected script [${script}]`
      );
  });

  if (opReturnOutputs.length > 1)
    throw new ImpossibleBehavior(
      `Tx [${txId}] has more than one (${opReturnOutputs.length}) OP_RETURN output`
    );
  if (opReturnOutputs.length === 0)
    throw new ImpossibleBehavior(`Tx [${txId}] has no OP_RETURN output`);
  const opReturnScriptLength = opReturnOutputs[0].script.length;

  return generateFeeEstimatorWithAssumptions(
    opReturnScriptLength,
    feeRatio,
    nativeSegwitOutputs.length,
    taprootOutputs.length
  );
};

/**
 * generates fee estimator for tx based on the OP_RETURN data length and type of the outputs
 * @param opReturnScriptLength
 * @param feeRatio
 * @param nativeSegwitOutputSize
 * @param taprootOutputSize
 */
export const generateFeeEstimatorWithAssumptions = (
  opReturnScriptLength: number,
  feeRatio: number,
  nativeSegwitOutputSize: number,
  taprootOutputSize: number
): FeeEstimator<BitcoinRunesUtxo> => {
  return (
    selectedBoxes: Array<BitcoinRunesUtxo>,
    changeBoxesCount: number
  ): bigint => {
    const estimatedVsize = estimateTxVsize(
      selectedBoxes.length,
      opReturnScriptLength,
      nativeSegwitOutputSize + changeBoxesCount, // There is always a native-segwit change output
      taprootOutputSize
    );
    return BigInt(Math.ceil(estimatedVsize * feeRatio));
  };
};

/**
 * extracts every SinglePayment from PaymentOrder so that each item of order has
 * at most one token after extraction
 *
 * Note: **all items of order should have at least one token**
 *
 * Note: the required native token for returned orders can exceed the original one
 * as this function may increase it to cover the minimum utxo value
 * @param order the aggregated PaymentOrder
 * @param minimumNativeToken the minimum native token for each SinglePayment
 * @returns the splitted PaymentOrder
 */
export const splitPaymentOrders = (
  order: PaymentOrder,
  minimumNativeToken: bigint
): PaymentOrder => {
  return order.reduce((sum: PaymentOrder, order: SinglePayment) => {
    if (order.assets.tokens.length === 0) {
      throw Error(
        `All items of Bitcoin Runes order should have at least one token while order [${JsonBigInt.stringify(
          order
        )}] has an item with no token`
      );
    } else {
      const nativeTokenAmount =
        order.assets.nativeToken >
        BigInt(order.assets.tokens.length) * minimumNativeToken
          ? order.assets.nativeToken / BigInt(order.assets.tokens.length)
          : minimumNativeToken;
      order.assets.tokens.forEach((token) => {
        sum.push({
          address: order.address,
          assets: {
            nativeToken: nativeTokenAmount,
            tokens: [token],
          },
          extra: order.extra,
        });
      });
    }
    return sum;
  }, []);
};

/**
 * sums the balance of a list of BitcoinRunesUtxo
 * @param utxos
 */
export const sumBitcoinRunesUtxosBalance = (
  utxos: Array<BitcoinRunesUtxo>
): AssetBalance => {
  const balance: AssetBalance = {
    nativeToken: 0n,
    tokens: [],
  };
  utxos.forEach((utxo) => {
    balance.nativeToken += utxo.value;
    utxo.runes.forEach((rune) => {
      const targetToken = balance.tokens.find(
        (token) => token.id === rune.runeId
      );
      if (targetToken) targetToken.value += rune.quantity;
      else balance.tokens.push({ id: rune.runeId, value: rune.quantity });
    });
  });
  return balance;
};
