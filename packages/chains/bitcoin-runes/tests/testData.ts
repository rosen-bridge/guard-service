import { BitcoinRunesUtxo } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { RosenTokens } from '@rosen-bridge/tokens';
import { AssetBalance, PaymentOrder } from '@rosen-chains/abstract-chain';
import { BitcoinRunesAssets } from '../lib';

export const lockAddress = 'bc1qkpxh7l6g7tmtnl70e6eqt4yv3y6uzsvvymjj4v';
export const lockAddressPublicKey =
  '0355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f';

export const testTokenMap: RosenTokens = [];

export const multiDecimalBtcTokenMap: RosenTokens = [
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
];

export const multiDecimalTokenMap: RosenTokens = [
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
  nativeToken: 10002n,
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
  nativeToken: 10002n,
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
export const wrappedBtcBalance: AssetBalance = {
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

export const transaction0PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160200fae135ec1780897a000000e0cfd501025210000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000",
  "txId": "88c2c31a990eb309a1aa3da72ae9f0817302b365bbb8482aeaca338aab357ee2",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46\\",\\"index\\":0,\\"value\\":4692,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}"
  ]
}`;

export const lockAddressUtxos: BitcoinRunesUtxo[] = [
  {
    txId: 'f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46',
    index: 0,
    value: 4692n,
    runes: [{ runeId: '880890:3052', quantity: 5500000n }],
  },
  {
    txId: 'f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98',
    index: 0,
    value: 5000n,
    runes: [{ runeId: '880890:3052', quantity: 5500000n }],
  },
  {
    txId: 'a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f',
    index: 2,
    value: 5000n,
    runes: [{ runeId: '880891:4054', quantity: 1000n }],
  },
];

export const transaction1PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160200fae135ec1780897a000000e0cfd50102570f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000",
  "txId": "3eabd1d82cf7b6921d817748319181afdb52bd9c99aa3a1b001671e8be461eda",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46\\",\\"index\\":0,\\"value\\":4692,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}"
  ]
}`;
export const transaction1Input0Utxo: BitcoinRunesUtxo = {
  txId: 'f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46',
  index: 0,
  value: 4692n,
  runes: [
    {
      runeId: '880890:3052',
      quantity: 5500000n,
    },
  ],
};
export const transaction1Input0BoxId = `${transaction1Input0Utxo.txId}.${transaction1Input0Utxo.index}`;
export const transaction1Assets = {
  inputAssets: {
    nativeToken: 4692n,
    tokens: [
      {
        id: '880890:3052',
        value: 5500000n,
      },
    ],
  },
  outputAssets: {
    nativeToken: 4692n,
    tokens: [
      {
        id: '880890:3052',
        value: 5500000n,
      },
    ],
  },
};
export const transaction1WrappedAssets = {
  inputAssets: {
    nativeToken: 4692n,
    tokens: [
      {
        id: '880890:3052',
        value: 5500n,
      },
    ],
  },
  outputAssets: {
    nativeToken: 4692n,
    tokens: [
      {
        id: '880890:3052',
        value: 5500n,
      },
    ],
  },
};
export const transaction1Order: PaymentOrder = [
  {
    address: 'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
    assets: {
      nativeToken: 330n,
      tokens: [
        {
          id: '880890:3052',
          value: 2000000n,
        },
      ],
    },
  },
];
export const transaction1WrappedOrder: PaymentOrder = [
  {
    address: 'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
    assets: {
      nativeToken: 330n,
      tokens: [
        {
          id: '880890:3052',
          value: 2000n,
        },
      ],
    },
  },
];
export const transaction1UnwrappedRequiredAssets: AssetBalance = {
  nativeToken: 876n, // 330 + 546 (order native token + min utxo value)
  tokens: [
    {
      id: '880890:3052',
      value: 2000000n,
    },
  ],
};
export const transaction1HashMessage0 =
  'a4f05cd58d0669f93c19ef9dde33462e1dab899b0d6ba3335bd4191167195d1d';
export const transaction1Signature0 =
  'ce1da54115ccfc64424310affb7e6f402c205a5b2cadf80fe2f695001ee9a0f907d9cc6a4d1a4ba99e1133b5779d62ae5cce68546436ffd6e300745f5d2b71e2';
export const transaction1SignedTxBytesHex =
  '70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160200fae135ec1780897a000000e0cfd50102570f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086c02483045022100ce1da54115ccfc64424310affb7e6f402c205a5b2cadf80fe2f695001ee9a0f9022007d9cc6a4d1a4ba99e1133b5779d62ae5cce68546436ffd6e300745f5d2b71e201210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f00000000';

export const transaction1InvalidForms = {
  generatePaymentTxString: ({
    txBytes,
    txId,
  }: {
    txBytes: string;
    txId: string;
  }) => `{
    "network": "bitcoin-runes",
    "eventId": "",
    "txBytes": "${txBytes}",
    "txId": "${txId}",
    "txType": "manual",
    "inputUtxos": [
      "{\\"txId\\":\\"f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46\\",\\"index\\":0,\\"value\\":4692,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}"
    ]
  }`,
  txData: {
    nullRunestone: {
      txBytes:
        '70736274ff0100d30200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000004d6a4b0100000000000003e800000000000003e839011b2eff6f19da9c786a5be52986e4fa888754f48fdc82639073e4b9827cba6224d854f00de94428ff0024e297ad5ab773a19ed6fac80c40de060f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '166dd1a1da97a62da4e36b9c014c2c4ec61371d58b1f1ce5f20a124871027b9d',
    },
    nullPointer: {
      txBytes:
        '70736274ff01009a0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000146a5d1100fae135ec1780897a000000e0cfd50102210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '834bf9fc7791813459726344ea5bd77143f2cd6ad9eec16dff6335328e757fce',
    },
    burningRunesByPointer: {
      txBytes:
        '70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160100fae135ec1780897a000000e0cfd50102210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '4b1f601533a5de60ca85efaa8b56009eeb3e9031ffb4ad684bff2a7b877d8723',
    },
    destinationOutputPointer: {
      txBytes:
        '70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160000fae135ec1780897a000000e0cfd50102210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '4c35ac588cf9ac5415425d79ac1a2e72e23df99b21c5a2f33acbaa6d4ab2bc2a',
    },
    invalidPointer: {
      txBytes:
        '70736274ff01009c0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000166a5d13160600fae135ec1780897a000000e0cfd50102210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: 'ff9dcc9a573af70520cd3504d4516ab0640bafe0082321dc6a9c24a14372947c',
    },
    invalidEdictRuneId: {
      txBytes:
        '70736274ff0100a10200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000001b6a5d181602000001e80702fae135ec1780897a000000e0cfd50102210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '931d9a07fa7f0fef7ddbe46fe608048980e9cb6e8c065b630e49b7fab0f68d33',
    },
    burningRunesByEdict: {
      txBytes:
        '70736274ff0100a20200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000001c6a5d19160200fae135ec1780897a000000e0cfd5010201d61fe80701210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: 'baf08b82d64690597af9be2d1d67290fb96c5356d3e0601b619d1a08d281a848',
    },
    invalidEdictOutput: {
      txBytes:
        '70736274ff0100a20200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000001c6a5d19160200fae135ec1780897a000000e0cfd5010201d61fe80706210d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: '81d4b87c1a72ab93218b77d12613f7f80382e9549a7501b9184d3c5e8eed3319',
    },
    noEdict: {
      txBytes:
        '70736274ff01008b0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50000000000000000056a5d021602c60e000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000',
      txId: 'fb9377724be8fd7c1eb6d9600c12b6e4c43d25cc5e39d01005b95441a43f149e',
    },
  },
};

export const transaction2PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff0100cb0200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000001c6a5d19160200fae135ec1780897a000000e0cfd5010201d61fe80702bb23000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000",
  "txId": "24c53f378bcf5504099761144870d44eb13f4dec5d5b0dd45d3d16caf47a4d6a",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98\\",\\"index\\":0,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f\\",\\"index\\":2,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880891:4054\\",\\"quantity\\":1000}]}"
  ]
}`;
export const transaction2Input0BoxId =
  'f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98.0';
export const transaction2Input0Utxo: BitcoinRunesUtxo = {
  txId: 'f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98',
  index: 0,
  value: 5000n,
  runes: [
    {
      runeId: '880890:3052',
      quantity: 5500000n,
    },
  ],
};
export const transaction2Input1BoxId =
  'a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f.2';
export const transaction2Input1Utxo: BitcoinRunesUtxo = {
  txId: 'a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f',
  index: 2,
  value: 5000n,
  runes: [
    {
      runeId: '880891:4054',
      quantity: 1000n,
    },
  ],
};
export const transaction2InputIds = [
  transaction2Input0BoxId,
  transaction2Input1BoxId,
];
export const transaction2InvalidForms = {
  generatePaymentTxString: (runes: BitcoinRunesAssets[]) => `{
    "network": "bitcoin-runes",
    "eventId": "",
    "txBytes": "70736274ff0100cb0200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff034a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c500000000000000001c6a5d19160200fae135ec1780897a000000e0cfd5010201d61fe80702bb23000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000",
    "txId": "24c53f378bcf5504099761144870d44eb13f4dec5d5b0dd45d3d16caf47a4d6a",
    "txType": "manual",
    "inputUtxos": [
      "{\\"txId\\":\\"f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98\\",\\"index\\":0,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f\\",\\"index\\":2,\\"value\\":5000,\\"runes\\":[${runes
        .map(
          (rune) =>
            `{\\"runeId\\":\\"${rune.runeId}\\",\\"quantity\\":${rune.quantity}}`
        )
        .join(',')}]}"
    ]
  }`,
  unusedRune: [
    {
      runeId: '880891:4054',
      quantity: 1000000n,
    },
    {
      runeId: '880892:5056',
      quantity: 2003000n,
    },
  ],
  incorrectRuneQuantity: [
    {
      runeId: '880891:4054',
      quantity: 1000000n,
    },
  ],
};

export const transaction3PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff0100a80200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff034a01000000000000160014c925ec47c3003b25cc5d64f0039870082092010b0000000000000000056a5d0216025c23000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000",
  "txId": "0dbd64255d0674ce6fd1429aefaab8e08ac7b5ae4d542bfc3c16c5b7b2f294ce",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98\\",\\"index\\":0,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f\\",\\"index\\":2,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880891:4054\\",\\"quantity\\":1000}]}"
  ]
}`;
export const transaction3SignedTxBytesHex =
  '70736274ff0100a80200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff034a01000000000000160014c925ec47c3003b25cc5d64f0039870082092010b0000000000000000056a5d0216025c23000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086c024830450221009cbdb6ade35fd032a4ffd621edecd562025fedca48ca275283e2e395c8145d8102205903c89f1801fe83bc3e4f4eaa8d882fa2ab3be6a4fa21afc6b4be5d920371d901210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086c02483045022100cd6879232b5299daa7141d3e5335014b6d59411a86fbf8b9625527c925ac935002204a3d0e88a4875c8a687c93ee8fdf96bcdb46d7ac69be9883c6646908bbbb975a01210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f00000000';
