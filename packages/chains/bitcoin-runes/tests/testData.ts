import { RosenTokens } from '@rosen-bridge/tokens';
import { AssetBalance } from '@rosen-chains/abstract-chain';

export const lockAddress = 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt';
export const lockAddressPublicKey =
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335';

export const testTokenMap: RosenTokens = [];

export const multiDecimalTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId:
        '1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4',
      name: 'testBTC',
      decimals: 6,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    bitcoin: {
      tokenId: 'btc',
      name: 'BTC',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
  },
  {
    ergo: {
      tokenId:
        'c258cc26510547a742b44b71373a9464ff7623232d8ffd5c5934c44c98850d54',
      name: 'test-wrapped-multi-decimal-runes',
      decimals: 3,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    'bitcoin-runes': {
      tokenId: '880890:3052',
      name: 'multi-decimal-runes',
      decimals: 6,
      type: 'Runes',
      residency: 'native',
      extra: {},
    },
  },
  {
    ergo: {
      tokenId:
        'c258cc26510547a742b44b71373a9464ff7623232d8ffd5c5934c44c98850d54',
      name: 'test-wrapped-fixed-decimal-runes',
      decimals: 4,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    'bitcoin-runes': {
      tokenId: '880892:5056',
      name: 'fixed-decimal-runes',
      decimals: 4,
      type: 'Runes',
      residency: 'native',
      extra: {},
    },
  },
];

export const actualBalance: AssetBalance = {
  nativeToken: 10001n,
  tokens: [
    {
      id: '880890:3052',
      value: 44123n,
    },
    {
      id: '880891:4054',
      value: 556600n,
    },
    {
      id: '880892:5056',
      value: 123n,
    },
  ],
};
export const wrappedBalance: AssetBalance = {
  nativeToken: 101n,
  tokens: [
    {
      id: '880890:3052',
      value: 45n,
    },
    {
      id: '880891:4054',
      value: 556600n,
    },
    {
      id: '880892:5056',
      value: 123n,
    },
  ],
};
export const unwrappedBalance: AssetBalance = {
  nativeToken: 10100n,
  tokens: [
    {
      id: '880890:3052',
      value: 45000n,
    },
    {
      id: '880891:4054',
      value: 556600n,
    },
    {
      id: '880892:5056',
      value: 123n,
    },
  ],
};
