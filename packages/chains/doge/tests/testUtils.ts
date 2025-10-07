import { TokenMap } from '@rosen-bridge/tokens';
import { randomBytes } from 'crypto';

import { DogeChain, DogeConfigs, TssSignFunction } from '../lib';
import TestDogeNetwork from './network/testDogeNetwork';
import * as testData from './testData';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const configs: DogeConfigs = {
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
  network: TestDogeNetwork,
  signFn: TssSignFunction = mockedSignFn,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.testTokenMap);
  return new DogeChain(network, configs, tokenMap, signFn);
};
export const generateChainObjectWithMultiDecimalTokenMap = async (
  network: TestDogeNetwork,
  signFn: TssSignFunction = mockedSignFn,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.multiDecimalTokenMap);
  return new DogeChain(network, configs, tokenMap, signFn);
};
