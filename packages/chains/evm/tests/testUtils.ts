import { FeeData } from 'ethers';
import { vi } from 'vitest';

import { TokenMap, RosenTokens } from '@rosen-bridge/tokens';
import { EcdsaSignMediator } from '@rosen-chains/abstract-chain';

import { AbstractEvmNetwork } from '../lib';
import EvmChain from '../lib/evmChain';
import { EvmConfigs, EvmTxStatus, TransactionHashes } from '../lib/types';
import TestEvmNetwork from './network/testEvmNetwork';
import TestChain from './testChain';
import * as testData from './testData';

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

export const mockedSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};

export const mockHasLockAddressEnoughAssets = (
  chain: EvmChain,
  value: boolean,
) => {
  spyOn(chain, 'hasLockAddressEnoughAssets').mockResolvedValue(value);
};

export const mockGetAddressBalanceForNativeToken = (
  network: AbstractEvmNetwork,
  value: bigint,
) => spyOn(network, 'getAddressBalanceForNativeToken').mockResolvedValue(value);

export const mockGetFeeData = (network: AbstractEvmNetwork, value: FeeData) => {
  spyOn(network, 'getFeeData').mockResolvedValue(value);
};

export const mockGetGasRequired = (
  network: AbstractEvmNetwork,
  value: bigint,
) => {
  spyOn(network, 'getGasRequired').mockResolvedValue(value);
};

export const mockGetAddressNextAvailableNonce = (
  network: AbstractEvmNetwork,
  value: number,
) => {
  spyOn(network, 'getAddressNextAvailableNonce').mockResolvedValue(value);
};

export const mockGetTransactionByNonce = (
  network: AbstractEvmNetwork,
  value: TransactionHashes,
) => {
  spyOn(network, 'getTransactionByNonce').mockResolvedValue(value);
};

export const generateChainObject = async (
  network: TestEvmNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
  evmTxType = 2,
  rosenTokens: RosenTokens = testData.testTokenMap,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(rosenTokens);
  return new TestChain(network, configs, tokenMap, signMediator, evmTxType);
};

export const mockGetTransactionStatus = (
  network: AbstractEvmNetwork,
  result: EvmTxStatus,
) => {
  spyOn(network, 'getTransactionStatus').mockResolvedValue(result);
};
