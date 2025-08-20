import { randomBytes } from 'crypto';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  BitcoinRunesChain,
  BitcoinRunesConfigs,
  TssSignFunction,
} from '../lib';
import { TestBitcoinRunesNetwork } from './network/TestBitcoinRunesNetwork';
import * as testData from './testData';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

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
export const mockedSignFn = () =>
  Promise.resolve({
    signature: '',
    signatureRecovery: '',
  });
export const generateChainObject = async (
  network: TestBitcoinRunesNetwork,
  signFn: TssSignFunction = mockedSignFn,
  tokens = testData.testTokenMap,
  logger?: AbstractLogger // this is for convenient purposes while debugging the tests
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(tokens);
  return new BitcoinRunesChain(network, configs, tokenMap, signFn, logger);
};
