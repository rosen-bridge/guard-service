import { randomBytes } from 'crypto';

import { TokenMap } from '@rosen-bridge/tokens';

import { ChainConfigs } from '../lib';
import TestChainNetwork from './network/testChainNetwork';
import TestChain from './testChain';
import * as testData from './testData';

export const generateRandomId = (): string => randomBytes(32).toString('hex');

export const generateChainObject = (
  network: TestChainNetwork,
  tokens: TokenMap = new TokenMap(),
) => {
  const config: ChainConfigs = {
    fee: 100n,
    confirmations: {
      observation: 5,
      payment: testData.paymentTxConfirmation,
      cold: 7,
      manual: 8,
      arbitrary: 9,
    },
    addresses: {
      lock: 'lock_addr',
      cold: 'cold_addr',
      permit: 'permit_addr',
      fraud: 'fraud_addr',
    },
    rwtId: 'rwt',
  };
  return new TestChain(network, config, tokens);
};
