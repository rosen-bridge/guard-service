import { ChainConfigs } from '@rosen-chains/abstract-chain';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

export const mockLockAddress = 'lock_address';
export const mockColdAddress = 'cold_address';

export const mockChainConfig: ChainConfigs = {
  fee: 100n,
  confirmations: {
    observation: 1,
    payment: 1,
    cold: 1,
    manual: 1,
    arbitrary: 1,
  },
  addresses: {
    lock: mockLockAddress,
    cold: mockColdAddress,
    permit: 'permit',
    fraud: 'fraud',
  },
  rwtId: 'rwt',
};

export const mockTokenMap = {
  [BITCOIN_CHAIN]: {
    tokenId: BTC,
    type: 'native',
    name: 'BTC',
    decimals: 9,
    residency: 'native',
    extra: {},
  },
  [ETHEREUM_CHAIN]: {
    tokenId: ETH,
    type: 'native',
    name: 'ETH',
    decimals: 8,
    residency: 'native',
    extra: {},
  },
  [BINANCE_CHAIN]: {
    tokenId: BNB,
    type: 'native',
    name: 'BNB',
    decimals: 5,
    residency: 'native',
    extra: {},
  },
};

export const mockBalances = {
  [ETH]: {
    chain: ETHEREUM_CHAIN,
    address: '1',
    tokenId: ETH,
    lastUpdate: '1643723400',
    balance: 1000000000n,
  },
  [BNB]: {
    chain: BINANCE_CHAIN,
    address: '2',
    tokenId: BNB,
    lastUpdate: '1643723401',
    balance: 500000000n,
  },
};

export const mockColdBalance = {
  chain: ETHEREUM_CHAIN,
  address: `${ETHEREUM_CHAIN}_mock_cold_address`,
  tokenId: 'tokenId',
  lastUpdate: '1',
  balance: 123n,
};

export const mockLockBalance = {
  chain: ETHEREUM_CHAIN,
  address: `${ETHEREUM_CHAIN}_mock_lock_address`,
  tokenId: 'tokenId2',
  lastUpdate: '1',
  balance: 1234n,
};
