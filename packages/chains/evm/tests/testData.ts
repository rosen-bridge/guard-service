import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { PaymentOrder, AssetBalance } from '@rosen-chains/abstract-chain';
import { Transaction } from 'ethers';
import { RosenTokens, TokenMap } from '@rosen-bridge/tokens';

export const lockAddress = '0xedee4752e5a2f595151c94762fb38e5730357785';
export const supportedTokens = [
  '0xedee4752e5a2f595151c94762fb38e5730357785',
  '0x12345752e5a2f595151c94762fb38e5730357785',
  '0xedee4752e5a2f595151c94762fb38e5730357786',
  '0xedee4752e5a2f595151c94762fb38e5730357787',
];

export const nativePaymentOrder: PaymentOrder = [
  {
    address: '0x6a6a84990fe4d261c6c7c701ea2ce64c0c32b1c7',
    assets: {
      nativeToken: 1000n,
      tokens: [],
    },
  },
];

export const nativePaymentWrappedOrder: PaymentOrder = [
  {
    address: '0x6a6a84990fe4d261c6c7c701ea2ce64c0c32b1c7',
    assets: {
      nativeToken: 10n,
      tokens: [],
    },
  },
];

export const testLockAddress = '0x4606d11ff65b17d29e8c5e4085f9a868a8e5e4f2';

export const transaction0PaymentTransaction = new PaymentTransaction(
  'test',
  '0x1c0fd9b5fd25dc41827ec7faf59495ae6b1108eea79f07d59a0da4628bf19989',
  '',
  Buffer.from(
    '02f0010a841dcd6500850b675899a0825208944606d11ff65b17d29e8c5e4085f9a868a8e5e4f2880149df7b6be0313680c0',
    'hex'
  ),
  TransactionType.manual
);
export const transaction0JsonString = `{
  "type": 2,
  "to": "0x4606d11ff65B17d29e8C5E4085f9a868A8E5E4f2",
  "data": "0x",
  "nonce": 10,
  "gasLimit": "21000",
  "gasPrice": null,
  "maxPriorityFeePerGas": "500000000",
  "maxFeePerGas": "48978500000",
  "value": "92850988521632054",
  "chainId": "1",
  "sig": null,
  "accessList": []
}
`;
export const transaction1JsonString = `{
  "type": 3,
  "to": "0x4606d11ff65B17d29e8C5E4085f9a868A8E5E4f2",
  "data": "0x",
  "nonce": 10,
  "gasLimit": "21000",
  "gasPrice": null,
  "maxPriorityFeePerGas": "500000000",
  "maxFeePerGas": "48978500000",
  "value": "92850988521632054",
  "chainId": "1",
  "sig": null,
  "accessList": []
}
`;

export const transaction1Json = {
  type: 2,
  to: '0xeDee4752e5a2F595151c94762fB38e5730357785',
  data: '0xa9059cbb0000000000000000000000004f0d2dde80b45e24ad4019a5aabd6c23aff2842b00000000000000000000000000000000000000000000000000000000e319aa30bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  nonce: 10,
  gasLimit: '21000',
  gasPrice: null,
  maxPriorityFeePerGas: '500000000',
  maxFeePerGas: '48978500000',
  value: 0,
  chainId: 1,
  sig: null,
  accessList: [],
};

export const transaction1WithType0Json = {
  type: 0,
  to: '0xeDee4752e5a2F595151c94762fB38e5730357785',
  data: '0xa9059cbb0000000000000000000000004f0d2dde80b45e24ad4019a5aabd6c23aff2842b00000000000000000000000000000000000000000000000000000000e319aa30bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  nonce: 10,
  gasLimit: '21000',
  gasPrice: '48978500000',
  value: 0,
  chainId: 1,
  sig: null,
};

export const erc20transaction = {
  type: 2,
  to: '0xeDee4752e5a2F595151c94762fB38e5730357785',
  data: '0xa9059cbb000000000000000000000000cfb01d43cb1299024171141d449bb9cd08f4c07500000000000000000000000000000000000000000000000000000000c502fc70bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  nonce: 10,
  gasLimit: '55000',
  gasPrice: null,
  maxPriorityFeePerGas: '500000000',
  maxFeePerGas: '48978500000',
  value: 0,
  chainId: '1',
  accessList: [],
  signature: {
    r: '0x7af681001bf23365afc66fbdb18e33bbd69779d3436c3ad2d27797bd133b2235',
    s: '0x79b8f448c88ba863f450ebe916d386d696efe49ed33932c20951ed53fe50f915',
    yParity: 0,
  },
};

export const splittedOrders: Array<PaymentOrder> = [
  [
    {
      address: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
      assets: {
        nativeToken: 10000n,
        tokens: [],
      },
    },
  ],
  [
    {
      address: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0xedee4752e5a2f595151c94762fb38e5730357785',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c075',
      assets: {
        nativeToken: 10000n,
        tokens: [],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c075',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0xedee4752e5a2f595151c94762fb38e5730357785',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c789',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0x12345752e5a2f595151c94762fb38e5730357785',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c79a',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0x12345752e5a2f595151c94762fb38e5730357785',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c79a',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0xedee4752e5a2f595151c94762fb38e5730357786',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
  [
    {
      address: '0x12345d45cb1299024171141d449bb9cd08f4c79a',
      assets: {
        nativeToken: 0n,
        tokens: [
          {
            id: '0xedee4752e5a2f595151c94762fb38e5730357787',
            value: 3305307248n,
          },
        ],
      },
    },
  ],
];

export const multipleOrders: PaymentOrder = [
  {
    address: '0xcfb01d43cb1299024171141d449bb9cd08f4c075',
    assets: {
      nativeToken: 10000n,
      tokens: [
        {
          id: '0xedee4752e5a2f595151c94762fb38e5730357785',
          value: 3305307248n,
        },
      ],
    },
  },
  {
    address: '0x12345d45cb1299024171141d449bb9cd08f4c075',
    assets: {
      nativeToken: 10000n,
      tokens: [
        {
          id: '0xedee4752e5a2f595151c94762fb38e5730357785',
          value: 3305307248n,
        },
      ],
    },
  },
  {
    address: '0x12345d45cb1299024171141d449bb9cd08f4c789',
    assets: {
      nativeToken: 0n,
      tokens: [
        {
          id: '0x12345752e5a2f595151c94762fb38e5730357785',
          value: 3305307248n,
        },
      ],
    },
  },
  {
    address: '0x12345d45cb1299024171141d449bb9cd08f4c79a',
    assets: {
      nativeToken: 0n,
      tokens: [
        {
          id: '0x12345752e5a2f595151c94762fb38e5730357785',
          value: 3305307248n,
        },
        {
          id: '0xedee4752e5a2f595151c94762fb38e5730357786',
          value: 3305307248n,
        },
        {
          id: '0xedee4752e5a2f595151c94762fb38e5730357787',
          value: 3305307248n,
        },
      ],
    },
  },
];

export const transaction1Assets: AssetBalance = {
  nativeToken: BigInt(21000) * BigInt(48978500000),
  tokens: [
    {
      id: '0xedee4752e5a2f595151c94762fb38e5730357785',
      value: BigInt(3810110000),
    },
  ],
};

export const transaction1WrappedAssets: AssetBalance = {
  nativeToken: BigInt(210) * BigInt(48978500000),
  tokens: [
    {
      id: '0xedee4752e5a2f595151c94762fb38e5730357785',
      value: BigInt(3810110000),
    },
  ],
};

export const paralelTransactions = [
  Transaction.from({
    type: 2,
    to: '0xeDee4752e5a2F595151c94762fB38e5730357785',
    data: '0xa9059cbb0000000000000000000000004f0d2dde80b45e24ad4019a5aabd6c23aff2842b00000000000000000000000000000000000000000000000000000000e319aa30bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '500000000',
    maxFeePerGas: '48978500000',
    value: '0',
    chainId: '1',
    accessList: [],
    signature: {
      r: '0xc15a4d9e300114ed005a2821f01f4aa74dcfd3daf10749f26d8cc1bd8507673c',
      s: '0x090492307ff4c7d2d514f373fa8fb01212c6af83391b6aed7039a3c9d6ecad11',
      yParity: 0,
    },
    hash: '0x3b194eea7cf9507e745806265738ca19213be209885534161ec0fa9c232c9fea',
  }),
  Transaction.from({
    type: 2,
    to: '0xedEe4752e5a2F595151831762fb38e5730357785',
    data: '0xa9059cbb0000000000000000000000004f0d2dde80b45e24ad4019a5bbad6c23aff2842b00000000000000000000000000000000000000000000000000000000e319aa30bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '500000000',
    maxFeePerGas: '48978500000',
    value: '0',
    chainId: '1',
    accessList: [],
    signature: {
      r: '0x81bb1bdf7b84554435406f5e070646a3e4e69cf201ace23ba271a3a901b7ea79',
      s: '0x51ac98ec928a6a8cc18ed3660ecf8e70c4aedeac46630ce3662f7b3e96f94505',
      yParity: 0,
    },
    hash: '0x977b555b3f2ff270239a664093b7a20a704dd9cae2a0a133315d429d86b9a085',
  }),
  Transaction.from({
    type: 2,
    to: '0xEDee4752e5a2F595151c94762fb38e5730437785',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '500000000',
    maxFeePerGas: '48978500000',
    value: '0',
    chainId: '1',
    accessList: [],
    signature: {
      r: '0xbd9f0cae0d3e31b026cc828b7e5778ab79cf09b86f32ef07ad364f3e8fc1c31d',
      s: '0x1d8db0fd3bc212ccff7661ecc9b95f9d985b4e75dfd211545f78ab0cef169ee1',
      yParity: 0,
    },
    hash: '0x51aff9363672214b387a471b7c973de7fa06cd020d7e46f5b11e7794ff4dc29b',
  }),
  Transaction.from({
    type: 2,
    to: '0xeDEE4752E5A2f595151C94712fb38e5730357785',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '500000000',
    maxFeePerGas: '48978500000',
    value: '0',
    chainId: '1',
    accessList: [],
    signature: {
      r: '0x832cf31faa4c8308123e9f57647e3a8ffc0d827d7408a4aae3a9c6048767209b',
      s: '0x226177bebf5a1d92b8d043f0386afaaea2474e7c2cc4b0e4d5c1a71b6f83a2d4',
      yParity: 1,
    },
    hash: '0x3b30923f8f5ff88a77665ca0066d70d4d8f441781a2cb7a74d62f4f10430a5d4',
  }),
  Transaction.from({
    type: 2,
    to: '0xEDeE4752e5A2F595151c94762FB38E5730357791',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '500000000',
    maxFeePerGas: '48978500000',
    value: '0',
    chainId: '1',
    accessList: [],
    signature: {
      r: '0xbf5c95c2d4308634e50a9d6044ce2e7a9744b73633ce48a93976c36e3a0967c4',
      s: '0x04e5e5a9058241d8e9f7ff00c05b789644ec41b60d033808ccb4e9d008d1c241',
      yParity: 1,
    },
    hash: '0xa3cd8e21a764a174f3d34eee309e7d8432f1a0f8b39ad1233f8c9d69e688f350',
  }),
  Transaction.from({
    type: 2,
    to: '0xeDeE4752E5a2f595151c94762fB38E5727357791',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcb',
    nonce: 53,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '5000000',
    maxFeePerGas: '489700000',
    value: '1000',
    chainId: '1',
    signature: {
      networkV: null,
      r: '0xbd2a150372dd89dde397ac6e5fdaeea8a856315650ff57dcd5eb7f9f92b94fa4',
      s: '0x12cddd21b99e6b2312ae00e959b60c9d9c7eb483c1a3fffc619a366fd040fb60',
      v: 28,
    },
    accessList: [],
  }),
  Transaction.from({
    type: 2,
    to: '0xeDeE4752E5a2f595151c94762fB38E5727357791',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcb',
    nonce: 54,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '5000000',
    maxFeePerGas: '489700000',
    value: '1000',
    chainId: '1',
    signature: {
      networkV: null,
      r: '0x8991fd857801643babfd314d9e4b87abb806a78b168810539cbd45e113d7a985',
      s: '0x03458e84b7408df28b5a404fd92f05350c2df583c39edce0b674f7e2417cba7a',
      v: 27,
    },
    accessList: [],
  }),
  Transaction.from({
    type: 2,
    to: '0xeDeE4752E5a2f595151c94762fB38E5727357791',
    data: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcb',
    nonce: 54,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '5000000',
    maxFeePerGas: '489700000',
    value: '1000',
    chainId: '1',
    signature: {
      networkV: null,
      r: '0x8991fd857801643babfd314d9e4b87abb806a78b168810539cbd45e113d7a985',
      s: '0x03458e84b7408df28b5a404fd92f05350c2df583c39edce0b674f7e2417cba7a',
      v: 27,
    },
    accessList: [],
  }),
  Transaction.from({
    type: 2,
    to: '0xeDeE4752E5a2f595151c94762fB38E5727357791',
    data: '0xbbbbbbb371bbbbbbbbbbbbbbbbbbbbcb',
    nonce: 55,
    gasLimit: '21000',
    gasPrice: null,
    maxPriorityFeePerGas: '5000000',
    maxFeePerGas: '489700000',
    value: '1000',
    chainId: '1',
    signature: {
      networkV: null,
      r: '0x97cc2fac88834d4435eb28231bd3aacb7b4a3292b87f0110ce68bf5ba5c0b455',
      s: '0x50f05c21c047daf5931dc9be31c1f1bc1d5119956ed51ec7c1542e3123d688e8',
      v: 28,
    },
    accessList: [],
  }),
];

export const transaction2UnsignedTx =
  '0x02f0010a841dcd6500850b675899a0825208944606d11ff65b17d29e8c5e4085f9a868a8e5e4f2880149df7b6be0313680c0';
export const transaction2SignedTx =
  '0x02f873010a841dcd6500850b675899a0825208944606d11ff65b17d29e8c5e4085f9a868a8e5e4f2880149df7b6be0313680c001a020775ad79e6b7ab8902503c4b3d9b57a14dd9a931b549f2d44d9e335e308a806a007d6a4560e5e586abcea735cb35a2fcaa7c19b6aba460fba37f604ad46dd270d';
export const transaction2Signature =
  '20775ad79e6b7ab8902503c4b3d9b57a14dd9a931b549f2d44d9e335e308a80607d6a4560e5e586abcea735cb35a2fcaa7c19b6aba460fba37f604ad46dd270d';
export const transaction2SignatureRecovery = '01';
export const transaction2TxId =
  '0x73c9ff5665d84067d98afbbeb2d9ff316c4b5bf885f9f3d31fa56eb1b13b3b90';

export const testTokenMap: RosenTokens = [];

export const multiDecimalTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId:
        '1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4',
      name: 'testETHER',
      decimals: 1,
      type: 'EIP-004',
      residency: 'wrapped',
    },
    cardano: {
      tokenId:
        '6d7cc9577a04be165cc4f2cf36f580dbeaf88f68e78f790805430940.727345544845522d6c6f656e',
      policyId: '6d7cc9577a04be165cc4f2cf36f580dbeaf88f68e78f790805430940',
      assetName: '727345544845522d6c6f656e',
      name: 'rsETHER-loen',
      decimals: 1,
      type: 'CIP26',
      residency: 'wrapped',
    },
    test: {
      tokenId: 'test-native-token',
      name: 'ETHER',
      decimals: 3,
      type: 'native',
      residency: 'native',
    },
  },
];

export const wrappedTokenId = '0xedee4752e5a2f595151c94762fb38e5730357785';
export const multiDecimalTokenMapWithTokens: RosenTokens = [
  {
    test: {
      tokenId: 'test-native-token',
      name: 'ETHER',
      decimals: 3,
      type: 'native',
      residency: 'native',
    },
  },
  {
    test: {
      tokenId: wrappedTokenId,
      name: 'WRAPPED-TOKEN',
      decimals: 18,
      type: 'ERC-20',
      residency: 'wrapped',
    },
  },
];
