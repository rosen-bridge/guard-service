import { randomBytes } from 'crypto';

import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSignMediator } from '@rosen-chains/abstract-chain';

import { HandshakeChain, HandshakeConfigs } from '../lib';
import TestHandshakeNetwork from './network/testHandshakeNetwork';
import * as testData from './testData';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const observationTxConfirmation = 5;
export const paymentTxConfirmation = 9;
export const coldTxConfirmation = 10;
export const manualTxConfirmation = 11;
export const arbitraryTxConfirmation = 12;
export const rwtId =
  '9410db5b39388c6b515160e7248346d7ec63d5457292326da12a26cc02efb526';

export const configs: HandshakeConfigs = {
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
  network: TestHandshakeNetwork,
  signMediator: EcdsaSignMediator = mockedSignMediator,
) => {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson(testData.testTokenMap);
  return new HandshakeChain(network, configs, tokenMap, signMediator);
};
