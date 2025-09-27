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

export const mockBalancesArray = [
  // ethereum entries (8) (3 cold) (5 lock)
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_cold_address`,
    tokenId: 'eth_token_01',
    lastUpdate: '1',
    balance: 5000n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_cold_address`,
    tokenId: 'eth_token_02',
    lastUpdate: '1',
    balance: 150n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_cold_address`,
    tokenId: 'eth_token_03',
    lastUpdate: '1',
    balance: 987654321n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_lock_address`,
    tokenId: 'eth_token_01',
    lastUpdate: '1',
    balance: 0n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_lock_address`,
    tokenId: 'eth_token_02',
    lastUpdate: '1',
    balance: 42n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_lock_address`,
    tokenId: 'eth_token_03',
    lastUpdate: '1',
    balance: 123456n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_lock_address`,
    tokenId: 'eth_token_04',
    lastUpdate: '1',
    balance: 9999n,
  },
  {
    chain: ETHEREUM_CHAIN,
    address: `${ETHEREUM_CHAIN}_mock_lock_address`,
    tokenId: 'eth_token_05',
    lastUpdate: '1',
    balance: 7777777n,
  },
  // bitcoin entries (12) (10 lock) (2 cold)
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_cold_address`,
    tokenId: 'btc_token_01',
    lastUpdate: '1',
    balance: 2500n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_cold_address`,
    tokenId: 'btc_token_02',
    lastUpdate: '1',
    balance: 10n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_01',
    lastUpdate: '1',
    balance: 123456789n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_02',
    lastUpdate: '1',
    balance: 42n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_03',
    lastUpdate: '1',
    balance: 777n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_04',
    lastUpdate: '1',
    balance: 999999n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_05',
    lastUpdate: '1',
    balance: 314159n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_06',
    lastUpdate: '1',
    balance: 1n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_07',
    lastUpdate: '1',
    balance: 500n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_08',
    lastUpdate: '1',
    balance: 2025n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_09',
    lastUpdate: '1',
    balance: 8888n,
  },
  {
    chain: BITCOIN_CHAIN,
    address: `${BITCOIN_CHAIN}_mock_lock_address`,
    tokenId: 'btc_token_10',
    lastUpdate: '1',
    balance: 12345n,
  },
];

export const mockBalanceEntityToAddressBalance = (balance: any) => ({
  address: balance.address,
  chain: balance.chain,
  balance: {
    tokenId: balance.tokenId,
    amount: Number(balance.balance),
    name: 'name',
    decimals: 8,
    isNativeToken: true,
  },
});
