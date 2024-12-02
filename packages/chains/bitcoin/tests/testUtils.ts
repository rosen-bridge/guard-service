import { randomBytes } from 'crypto';
import * as testData from './testData';
import { BitcoinChain, BitcoinConfigs, TssSignFunction } from '../lib';
import TestBitcoinNetwork from './network/TestBitcoinNetwork';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const configs: BitcoinConfigs = {
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
export const generateChainObject = (
  network: TestBitcoinNetwork,
  signFn: TssSignFunction = mockedSignFn
) => {
  return new BitcoinChain(network, configs, testData.testTokenMap, signFn);
};
export const generateChainObjectWithMultiDecimalTokenMap = (
  network: TestBitcoinNetwork,
  signFn: TssSignFunction = mockedSignFn
) => {
  return new BitcoinChain(
    network,
    configs,
    testData.multiDecimalTokenMap,
    signFn
  );
};
