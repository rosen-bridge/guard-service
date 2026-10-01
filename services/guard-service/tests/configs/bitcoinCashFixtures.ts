import { decodeAddress } from '@rosen-bridge/address-codec';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';

import { ChainConfigs } from '../../src/types/contract';

// Synthetic public-key/asset fixtures; never operator deployment values.
export const bchPublicKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
export const bchLock = decodeAddress(
  'bitcoin-cash',
  '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac',
);
export const bchCold = decodeAddress(
  'bitcoin-cash',
  '76a914' + '12'.repeat(20) + '88ac',
);
export const ergoAddress =
  '9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD';
export const bchContract = (): ChainConfigs => ({
  addresses: {
    lock: bchLock,
    cold: bchCold,
    WatcherTriggerEvent: ergoAddress,
    WatcherPermit: ergoAddress,
    Fraud: ergoAddress,
    Commitment: ergoAddress,
    guardSign: ergoAddress,
  },
  tokens: { RWTId: '12'.repeat(32), CleanupNFT: '34'.repeat(32) },
  cleanupConfirm: 6,
});
export const bchValues = (): Record<string, unknown> => ({
  'bitcoinCash.enabled': true,
  'bitcoinCash.chainNetwork': 'rpc',
  'bitcoinCash.rpc.url': 'http://127.0.0.1:18443/wallet/test',
  'bitcoinCash.rpc.expectedChain': 'regtest',
  'bitcoinCash.rpc.timeoutMs': 5000,
  'bitcoinCash.bankPublicKey': bchPublicKey,
  'bitcoinCash.tssChainCode': 'SyntheticBchChainCode',
  'bitcoinCash.derivationPath': [44, 145, 0, 0],
  'bitcoinCash.feeRate': 1,
  'bitcoinCash.maxFee': '10000',
  'bitcoinCash.minimumUtxoValue': '546',
  'bitcoinCash.maxUtxoPages': 20,
  ...Object.fromEntries(
    ['observation', 'payment', 'cold', 'manual', 'arbitrary'].map((key) => [
      `bitcoinCash.confirmation.${key}`,
      6,
    ]),
  ),
  'balanceHandler.bitcoinCash.tokensPerIteration.rpc': 1,
  'balanceHandler.default.updateInterval': 300,
  'balanceHandler.default.updateBatchInterval': 0,
});
export const bchTokenSet = (): RosenTokens => [
  {
    'bitcoin-cash': {
      tokenId: 'bch',
      name: 'BCH',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
    ergo: {
      tokenId: '56'.repeat(32),
      name: 'Wrapped BCH',
      decimals: 8,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
  },
];
export const bchTokenMap = async (): Promise<TokenMap> => {
  const tokens = new TokenMap();
  await tokens.updateConfigByJson(bchTokenSet());
  return tokens;
};
