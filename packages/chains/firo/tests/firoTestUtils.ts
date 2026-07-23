import { randomBytes } from 'crypto';

import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSignMediator } from '@rosen-chains/abstract-chain';

import { FiroChain } from '../lib';
import * as testData from './chainTestData';
import TestFiroNetwork from './network/testFiroNetwork';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const mockedSignMediator: EcdsaSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};

export const generateChainObject = async (
  network: TestFiroNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.testTokenMapRosen);
  return new FiroChain(
    network,
    testData.testFiroConfigs,
    tokenMap,
    signMediator,
  );
};

export const generateChainObjectWithMultiDecimalTokenMap = async (
  network: TestFiroNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.multiDecimalTokenMap);
  return new FiroChain(
    network,
    testData.testFiroConfigs,
    tokenMap,
    signMediator,
  );
};
