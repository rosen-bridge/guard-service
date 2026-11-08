import { randomBytes } from 'crypto';

import { TokenMap } from '@rosen-bridge/tokens';
import {
  EcdsaSignMediator,
  PaymentTransaction,
} from '@rosen-chains/abstract-chain';

import { FiroChain } from '../lib';
import * as testData from './chainTestData';
import TestFiroNetwork from './network/testFiroNetwork';
import { TestFiroChain } from './testFiroChain';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const mockedSignMediator: EcdsaSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};

export const generateChainObject = async (
  network: TestFiroNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
  getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined> = async () => undefined,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.testTokenMapRosen);
  return new TestFiroChain(
    network,
    testData.testFiroConfigs,
    tokenMap,
    signMediator,
    getSavedTransactionById,
  );
};

export const generateChainObjectWithMultiDecimalTokenMap = async (
  network: TestFiroNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
  getSavedTransactionById: (
    txId: string,
  ) => Promise<PaymentTransaction | undefined> = async () => undefined,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.multiDecimalTokenMap);
  return new FiroChain(
    network,
    testData.testFiroConfigs,
    tokenMap,
    signMediator,
    getSavedTransactionById,
  );
};
