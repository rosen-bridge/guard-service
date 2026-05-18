import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import { ChainAddressBalanceEntity } from '../../src/db/entities/chainAddressBalanceEntity';

// COMET cardano tokenId from test tokensMap
export const cardanoCometTokenId =
  'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432';
const cardanoErgTokenId =
  'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432';
const cardanoHoskyTokenId =
  'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59';
const cardanoRSNTokenId =
  '45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48';
const cardanoBTCTokenId =
  '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e';
const cardanoMDTokenTokenId =
  'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e';

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

export const cardanoTokenIds = [
  cardanoErgTokenId,
  cardanoCometTokenId,
  cardanoHoskyTokenId,
  cardanoRSNTokenId,
  cardanoBTCTokenId,
  cardanoMDTokenTokenId,
];

export const mockCardanoBalances = (() => {
  const records: ChainAddressBalanceEntity[] = [];
  for (const address of [cardanoLockAddress, cardanoColdAddress]) {
    for (const token of cardanoTokenIds) {
      records.push({
        chain: CARDANO_CHAIN,
        address: address,
        tokenId: token,
        lastUpdate: '1643723422',
        balance: 10000n,
      });
    }
  }
  return records;
})();

export const mockCardanoLockBalances = mockCardanoBalances.slice(0, 4);
