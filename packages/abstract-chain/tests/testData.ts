import { RosenTokens } from '@rosen-bridge/tokens';
import { AssetBalance, EventTrigger, PaymentOrder, TokenInfo } from '../lib';

export const paymentTxConfirmation = 6;

export const validEvent: EventTrigger = {
  height: 300,
  fromChain: 'test',
  toChain: 'chain-2',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '1000000',
  bridgeFee: '1000',
  networkFee: '5000',
  sourceChainTokenId: 'sourceTokenId',
  targetChainTokenId: 'targetTokenId',
  sourceTxId:
    '6e3dbf41a8e3dbf41a8cd0fe059a54cef8bb140322503d0555a9851f056825bc',
  sourceChainHeight: 1000,
  sourceBlockId:
    '01a33c00accaa91ebe0c946bffe1ec294280a3a51a90f7f4b011f3f37c29c5ed',
  WIDsHash: 'bb2b2272816e1e9993fc535c0cf57c668f5cd39c67cfcd55b4422b1aa87cd0c3',
  WIDsCount: 2,
};

export const invalidEvent: EventTrigger = {
  height: 300,
  fromChain: 'test',
  toChain: 'chain-2',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '5500',
  bridgeFee: '1000',
  networkFee: '5000',
  sourceChainTokenId: 'sourceTokenId',
  targetChainTokenId: 'targetTokenId',
  sourceTxId:
    '6e3dbf41a8e3dbf41a8cd0fe059a54cef8bb140322503d0555a9851f056825bc',
  sourceChainHeight: 1000,
  sourceBlockId:
    '01a33c00accaa91ebe0c946bffe1ec294280a3a51a90f7f4b011f3f37c29c5ed',
  WIDsHash: 'bb2b2272816e1e9993fc535c0cf57c668f5cd39c67cfcd55b4422b1aa87cd0c3',
  WIDsCount: 2,
};

export const validEventWithHighFee: EventTrigger = {
  height: 300,
  fromChain: 'test',
  toChain: 'chain-2',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '1000000',
  bridgeFee: '1000',
  networkFee: '900000',
  sourceChainTokenId: 'sourceTokenId',
  targetChainTokenId: 'targetTokenId',
  sourceTxId:
    '6e3dbf41a8e3dbf41a8cd0fe059a54cef8bb140322503d0555a9851f056825bc',
  sourceChainHeight: 1000,
  sourceBlockId:
    '01a33c00accaa91ebe0c946bffe1ec294280a3a51a90f7f4b011f3f37c29c5ed',
  WIDsHash: 'bb2b2272816e1e9993fc535c0cf57c668f5cd39c67cfcd55b4422b1aa87cd0c3',
  WIDsCount: 2,
};

export const testTokenMap: RosenTokens = {
  idKeys: {
    test: 'tokenId',
    'test-utxo': 'tokenId',
  },
  tokens: [
    {
      test: {
        tokenId: 'test-native-token',
        name: 'test-native-token',
        decimals: 2,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
      'test-utxo': {
        tokenId: 'wrapped-native-token',
        name: 'wrapped-test-native-token',
        decimals: 1,
        metaData: {
          type: 'ANY',
          residency: 'wrapped',
        },
      },
    },
    {
      test: {
        tokenId: 'wrapped-test-utxo-native-token',
        name: 'wrapped-test-utxo-native-token',
        decimals: 3,
        metaData: {
          type: 'ANY',
          residency: 'wrapped',
        },
      },
      'test-utxo': {
        tokenId: 'test-utxo-native-token',
        name: 'test-utxo-native-token',
        decimals: 3,
        metaData: {
          type: 'native',
          residency: 'native',
        },
      },
    },
    {
      test: {
        tokenId: 'multi-decimal-token1',
        name: 'multi-decimal-token1',
        decimals: 4,
        metaData: {
          type: 'ANY',
          residency: 'native',
        },
      },
      'test-utxo': {
        tokenId: 'wrapped-multi-decimal-token1',
        name: 'wrapped-multi-decimal-token1',
        decimals: 1,
        metaData: {
          type: 'ANY',
          residency: 'wrapped',
        },
      },
    },
    {
      test: {
        tokenId: 'wrapped-multi-decimal-token2',
        name: 'wrapped-multi-decimal-token2',
        decimals: 4,
        metaData: {
          type: 'ANY',
          residency: 'wrapped',
        },
      },
      'test-utxo': {
        tokenId: 'multi-decimal-token2',
        name: 'multi-decimal-token2',
        decimals: 0,
        metaData: {
          type: 'ANY',
          residency: 'native',
        },
      },
    },
    {
      test: {
        tokenId: 'fixed-decimal-token',
        name: 'fixed-decimal-token',
        decimals: 4,
        metaData: {
          type: 'ANY',
          residency: 'native',
        },
      },
      'test-utxo': {
        tokenId: 'wrapped-fixed-decimal-token',
        name: 'wrapped-fixed-decimal-token',
        decimals: 4,
        metaData: {
          type: 'ANY',
          residency: 'wrapped',
        },
      },
    },
  ],
};

export const actualBalance: AssetBalance = {
  nativeToken: 10000n,
  tokens: [
    {
      id: 'multi-decimal-token1',
      value: 44123n,
    },
    {
      id: 'wrapped-multi-decimal-token2',
      value: 556600n,
    },
    {
      id: 'fixed-decimal-token',
      value: 123n,
    },
  ],
};
export const wrappedBalance: AssetBalance = {
  nativeToken: 1000n,
  tokens: [
    {
      id: 'multi-decimal-token1',
      value: 45n,
    },
    {
      id: 'wrapped-multi-decimal-token2',
      value: 56n,
    },
    {
      id: 'fixed-decimal-token',
      value: 123n,
    },
  ],
};
export const unwrappedBalance: AssetBalance = {
  nativeToken: 10000n,
  tokens: [
    {
      id: 'multi-decimal-token1',
      value: 45000n,
    },
    {
      id: 'wrapped-multi-decimal-token2',
      value: 560000n,
    },
    {
      id: 'fixed-decimal-token',
      value: 123n,
    },
  ],
};
export const originalTokens = [
  {
    id: 'id2',
    value: 20n,
  },
  {
    id: 'id1',
    value: 10n,
  },
];
export const unorganizedAssetBalance: AssetBalance = {
  nativeToken: 200n,
  tokens: originalTokens,
};
export const unorganizedAssetBalance2: AssetBalance = {
  nativeToken: 100n,
  tokens: structuredClone(originalTokens),
};
export const sortedTokens: TokenInfo[] = [
  {
    id: 'id1',
    value: 10n,
  },
  {
    id: 'id2',
    value: 20n,
  },
];
export const unorganizedOrder: PaymentOrder = [
  {
    address: 'addr2',
    assets: unorganizedAssetBalance,
  },
  {
    address: 'addr1',
    assets: {
      nativeToken: 100n,
      tokens: structuredClone(originalTokens),
    },
  },
];
export const organizedOrder: PaymentOrder = [
  {
    address: 'addr2',
    assets: {
      nativeToken: unorganizedAssetBalance.nativeToken,
      tokens: structuredClone(sortedTokens),
    },
  },
  {
    address: 'addr1',
    assets: {
      nativeToken: 100n,
      tokens: structuredClone(sortedTokens),
    },
  },
];
export const encodedOrder = `[{"address":"addr2","assets":{"nativeToken":200,"tokens":[{"id":"id1","value":10},{"id":"id2","value":20}]}},{"address":"addr1","assets":{"nativeToken":100,"tokens":[{"id":"id1","value":10},{"id":"id2","value":20}]}}]`;
