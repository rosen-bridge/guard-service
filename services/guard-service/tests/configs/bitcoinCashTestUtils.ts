import { decodeAddress } from '@rosen-bridge/address-codec';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';

import { ChainConfigs } from '../../src/types/contract';
import { bchPublicKey, ergoAddress } from './bitcoinCashTestData';

// Synthetic public-key/asset fixtures; never operator deployment values.
/** Mainnet P2PKH address derived from the synthetic treasury public key. */
export const bchLock = decodeAddress(
  'bitcoin-cash',
  '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac',
);
/** A distinct native P2PKH address for synthetic cold-storage payouts. */
export const bchCold = decodeAddress(
  'bitcoin-cash',
  '76a914' + '12'.repeat(20) + '88ac',
);
/** Return a fresh synthetic BCH contract configuration. */
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
/** Return mutable operator configuration for an isolated BCH test. */
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
  'balanceHandler.bitcoinCash.tokensPerIteration.rpc': 9999,
  'balanceHandler.default.updateInterval': 300,
  'balanceHandler.default.updateBatchInterval': 0,
});
/** Return fresh native BCH and wrapped Ergo token metadata. */
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
/** Initialize the synthetic native BCH token map. */
export const bchTokenMap = async (): Promise<TokenMap> => {
  const tokens = new TokenMap();
  await tokens.updateConfigByJson(bchTokenSet());
  return tokens;
};
