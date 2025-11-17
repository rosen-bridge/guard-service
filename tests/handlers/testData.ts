import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';

// COMET cardano tokenId from test tokensMap
export const cardanoCometTokenId =
  'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432';

export const cardanoLockAddress = `${CARDANO_CHAIN}_mock_lock_address`;
export const cardanoColdAddress = `${CARDANO_CHAIN}_mock_cold_address`;
export const bitcoinColdAddress = `${BITCOIN_CHAIN}_mock_cold_address`;

export const mockBalances: Record<string, Array<ChainAddressBalanceEntity>> = {
  [BITCOIN_CHAIN]: [
    {
      chain: BITCOIN_CHAIN,
      address: bitcoinColdAddress,
      tokenId: BTC,
      lastUpdate: '1643723400',
      balance: 100n,
    },
  ],
  [CARDANO_CHAIN]: [
    {
      chain: CARDANO_CHAIN,
      address: cardanoColdAddress,
      tokenId: ADA,
      lastUpdate: '1643723422',
      balance: 50000n,
    },
    {
      chain: CARDANO_CHAIN,
      address: cardanoColdAddress,
      tokenId: cardanoCometTokenId,
      lastUpdate: '1643723401',
      balance: 20000n,
    },
    {
      chain: CARDANO_CHAIN,
      address: cardanoLockAddress,
      tokenId: cardanoCometTokenId,
      lastUpdate: '1643722301',
      balance: 6666666n,
    },
  ],
};

export const mockAddressBalance = [
  {
    address: 'bitcoin_mock_cold_address',
    chain: 'bitcoin',
    balance: {
      tokenId: 'btc',
      amount: 100,
      name: 'BTC',
      decimals: 8,
      isNativeToken: true,
    },
  },
  {
    address: 'cardano_mock_cold_address',
    chain: 'cardano',
    balance: {
      tokenId: 'ada',
      amount: 50000,
      name: 'ADA',
      decimals: 6,
      isNativeToken: true,
    },
  },
  {
    address: 'cardano_mock_cold_address',
    chain: 'cardano',
    balance: {
      tokenId:
        'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
      amount: 20000,
      name: 'wrapped-comet',
      decimals: 0,
      isNativeToken: false,
    },
  },
];

export const mockAddressBalance2 = [
  {
    address: 'cardano_mock_lock_address',
    chain: 'cardano',
    balance: {
      tokenId:
        'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
      amount: 6666666,
      name: 'wrapped-comet',
      decimals: 0,
      isNativeToken: false,
    },
  },
];

export const mockAddressBalance3 = [
  {
    address: 'bitcoin_mock_cold_address',
    chain: 'bitcoin',
    balance: {
      tokenId: 'btc',
      amount: 100,
      name: 'BTC',
      decimals: 8,
      isNativeToken: true,
    },
  },
  {
    address: 'cardano_mock_cold_address',
    chain: 'cardano',
    balance: {
      tokenId: 'ada',
      amount: 50000,
      name: 'ADA',
      decimals: 6,
      isNativeToken: true,
    },
  },
];
