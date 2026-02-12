import { randomBytes } from 'crypto';
import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSignMediator } from '@rosen-chains/abstract-chain';
import { FiroChain, FiroConfigs } from '../lib'; // adjust import
import TestFiroNetwork from './network/testFiroNetwork';
import * as testData from './chainTestData';

export const generateRandomId = (): string =>
  randomBytes(32).toString('hex');

export const mockedSignMediator: EcdsaSignMediator = {
  sign: vi.fn(),
  isInSign: vi.fn().mockResolvedValue(true),
};
// TODO: We can use noNativeToekn from /home/dev/development/rosen-bridge/utils/packages/rosen-extractor/tests/getRosenData/testUtils.ts I think
export const generateChainObject = async (
  network: TestFiroNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.testTokenMapRosen);
  return new FiroChain(network, testData.testFiroConfigs, tokenMap, signMediator);
};