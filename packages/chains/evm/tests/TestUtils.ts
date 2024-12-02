import * as testData from './testData';
import {
  EvmConfigs,
  EvmTxStatus,
  TransactionHashes,
  TssSignFunction,
} from '../lib/types';
import EvmChain from '../lib/EvmChain';
import { vi } from 'vitest';
import { AbstractEvmNetwork } from '../lib';
import TestEvmNetwork from './network/TestEvmNetwork';
import TestChain from './TestChain';

const spyOn = vi.spyOn;
const observationTxConfirmation = 5;
const paymentTxConfirmation = 9;
const coldTxConfirmation = 10;
const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';
export const configs: EvmConfigs = {
  maxParallelTx: 10,
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
  gasPriceSlippage: 15n,
  gasLimitSlippage: 25n,
  gasLimitMultiplier: 3n,
  gasLimitCap: 100000n,
};

export const mockedSignFn = () =>
  Promise.resolve({
    signature: '',
    signatureRecovery: '',
  });

export const mockHasLockAddressEnoughAssets = (
  chain: EvmChain,
  value: boolean
) => {
  spyOn(chain, 'hasLockAddressEnoughAssets').mockResolvedValue(value);
};

export const mockGetAddressBalanceForNativeToken = (
  network: AbstractEvmNetwork,
  value: bigint
) => {
  spyOn(network, 'getAddressBalanceForNativeToken').mockResolvedValue(value);
};

export const mockGetMaxFeePerGas = (
  network: AbstractEvmNetwork,
  value: bigint
) => {
  spyOn(network, 'getMaxFeePerGas').mockResolvedValue(value);
};

export const mockGetGasRequired = (
  network: AbstractEvmNetwork,
  value: bigint
) => {
  spyOn(network, 'getGasRequired').mockResolvedValue(value);
};

export const mockGetAddressNextAvailableNonce = (
  network: AbstractEvmNetwork,
  value: number
) => {
  spyOn(network, 'getAddressNextAvailableNonce').mockResolvedValue(value);
};

export const mockGetTransactionByNonce = (
  network: AbstractEvmNetwork,
  value: TransactionHashes
) => {
  spyOn(network, 'getTransactionByNonce').mockResolvedValue(value);
};

export const mockGetMaxPriorityFeePerGas = (
  network: AbstractEvmNetwork,
  value: bigint
) => {
  spyOn(network, 'getMaxPriorityFeePerGas').mockResolvedValue(value);
};

export const generateChainObject = (
  network: TestEvmNetwork,
  signFn: TssSignFunction = mockedSignFn
) => {
  return new TestChain(
    network,
    configs,
    testData.testTokenMap,
    testData.supportedTokens,
    signFn
  );
};

export const generateChainObjectWithMultiDecimalTokenMap = (
  network: TestEvmNetwork,
  signFn: TssSignFunction = mockedSignFn
) => {
  return new TestChain(
    network,
    configs,
    testData.multiDecimalTokenMap,
    testData.supportedTokens,
    signFn
  );
};

export const mockGetTransactionStatus = (
  network: AbstractEvmNetwork,
  result: EvmTxStatus
) => {
  spyOn(network, 'getTransactionStatus').mockResolvedValue(result);
};
