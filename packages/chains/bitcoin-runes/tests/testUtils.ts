import { Psbt } from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSignMediator } from '@rosen-chains/abstract-chain';

import {
  BitcoinRunesChain,
  BitcoinRunesConfigs,
  BitcoinRunesTransaction,
  BitcoinRunesUtxo,
} from '../lib';
import { generateFeeEstimatorWithPsbt } from '../lib/utils';
import { TestBitcoinRunesNetwork } from './network/testBitcoinRunesNetwork';
import * as testData from './testData';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const configs: BitcoinRunesConfigs = {
  fee: 1000000n,
  addresses: {
    lock: testData.lockAddress,
    cold: 'cold',
    permit: 'permit',
    fraud: 'fraud',
  },
  rwtId: rwtId,
  confirmations: {
    observation: observationTxConfirmation,
    payment: paymentTxConfirmation,
    cold: coldTxConfirmation,
    manual: manualTxConfirmation,
    arbitrary: arbitraryTxConfirmation,
  },
  aggregatedPublicKey: testData.lockAddressPublicKey,
  txFeeSlippage: 10,
};
export const mockedSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};
export const generateChainObject = async (
  network: TestBitcoinRunesNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
  tokens = testData.testTokenMap,
  logger?: AbstractLogger, // this is for convenient purposes while debugging the tests
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(tokens);
  return new BitcoinRunesChain(
    network,
    configs,
    tokenMap,
    signMediator,
    logger,
  );
};

/**
 * asserts that the actual fee of a generated transaction (total input value minus
 * total output value) matches the estimated fee for its size
 * @param transaction the generated transaction
 * @param feeRatio the fee ratio the transaction was generated with
 */
export const expectValidTxFee = (
  transaction: BitcoinRunesTransaction,
  feeRatio: number,
) => {
  const psbt = Psbt.fromBuffer(Buffer.from(transaction.txBytes));

  const inBtc = Array.from(new Set(transaction.inputUtxos))
    .map(
      (serializedUtxo) =>
        (JsonBigInt.parse(serializedUtxo) as BitcoinRunesUtxo).value,
    )
    .reduce((sum, value) => sum + value, 0n);
  const outBtc = psbt.txOutputs
    .map((output) => BigInt(output.value))
    .reduce((sum, value) => sum + value, 0n);
  const fee = inBtc - outBtc;

  // all inputs and outputs are already added to the psbt
  const estimatedFee = generateFeeEstimatorWithPsbt(psbt, feeRatio)(
    Array.from(
      new Set(transaction.inputUtxos),
    ) as unknown as BitcoinRunesUtxo[],
    0,
  );

  expect(fee).toEqual(estimatedFee);
};
