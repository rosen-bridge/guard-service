import { BitcoinRunesUtxo } from '@rosen-bridge/bitcoin-runes-utxo-selection';
import { RosenTokens } from '@rosen-bridge/tokens';
import { AssetBalance, PaymentOrder } from '@rosen-chains/abstract-chain';

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
  "txBytes": "70736274ff0100da0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c5d20c000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000",
  "txId": "f28ad9dc1e65d218f203c5bc309183050f44a23b0dd474348fd2c6bb78e102f0",
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
export const lockAddressBoxIds = lockAddressUtxos.map(
  (utxo) => `${utxo.txId}.${utxo.index}`,
);
export const lockBalance: AssetBalance = {
  nativeToken: 14692n,
  tokens: [
    {
      id: '880890:3052',
      value: 11000000n,
    },
    {
      id: '880891:4054',
      value: 1000n,
    },
  ],
};

export const realisticLockAddressUtxos: BitcoinRunesUtxo[] = [
  {
    txId: 'd1797fa384ada5953128474f397b31d18681376fb542e24c2e1f79ee94799637',
    index: 0,
    value: 294n,
    runes: [{ runeId: '880890:3052', quantity: 5500000n }],
  },
  {
    txId: 'b5083b8cf78c5614228c64fe49f2372f1e3dd04fd836ee34054bd578abca5a76',
    index: 2,
    value: 294n,
    runes: [{ runeId: '880891:4054', quantity: 1000n }],
  },
  {
    txId: 'ecbcf2c087f0a884147d98a0775c1e3bc77ee7ea924c57d204b2d653c4f54bdf',
    index: 0,
    value: 800n,
    runes: [],
  },
  {
    txId: '805b71cde3d19223fabf9bb84cb3bb2132e0eb002de7dd9278ea62529e64f7be',
    index: 0,
    value: 1500n,
    runes: [],
  },
];
export const realisticLockAddressBoxIds = realisticLockAddressUtxos.map(
  (utxo) => `${utxo.txId}.${utxo.index}`,
);
export const realisticLockBalance: AssetBalance = {
  nativeToken: 2888n,
  tokens: [
    {
      id: '880890:3052',
      value: 5500000n,
    },
    {
      id: '880891:4054',
      value: 1000n,
    },
  ],
};

export const transaction1PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000",
  "txId": "7686a7715250f92ebad7c10e209aa633d0d6aca463f8db14fe7f8caeff03a35c",
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
  nativeToken: 918n, // 330 + 2 * 294 (order native token + two minimum native-segwit utxo value)
  tokens: [
    {
      id: '880890:3052',
      value: 2000000n,
    },
  ],
};
export const transaction1HashMessage0 =
  'd074f84537540651de6cbd285d211c4473e494f5168ed572735f7417bd43fabc';
export const transaction1Signature0 =
  '2257c00d4bcd56594dd79dbe3afd5ac348b538c38f363a01ce1305a9c578e9d90404eb689ad95214edba7365ffb20b7be43151c4a7ae8f89474a85f74d343c0f';
export const transaction1SignedTxBytesHex =
  '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086b0247304402202257c00d4bcd56594dd79dbe3afd5ac348b538c38f363a01ce1305a9c578e9d902200404eb689ad95214edba7365ffb20b7be43151c4a7ae8f89474a85f74d343c0f01210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f0000000000';

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
        '70736274ff0100f00200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000000000004b6a4b0100000000000003e800000000000003e839011b2eff6f19da9c786a5be52986e4fa888754f48fdc82639073e4b9827cba6224d854f00de94428ff0024e297ad5ab773a19ed6fac80c4a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c5d80e000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '00073bd122f2c0a4563126b0423d77d429dab400a88db6b90ca0f52d909726b4',
    },
    nullPointer: {
      txBytes:
        '70736274ff0100b90200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000146a5d1100fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50f0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '04bd80241627598ea109219b433dc889a19438d2e690889f8f19a3beb80b701a',
    },
    burningRunesByPointer: {
      txBytes:
        '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160100fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: 'ecfbf046499daf671181e1271b903a0e1824bbd9f7d09d9fec6890416925faa3',
    },
    destinationOutputPointer: {
      txBytes:
        '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160200fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '00188d7e3a588db0207062a5265732a2df90159c72aef5e2ace6ec20468f54a0',
    },
    invalidPointer: {
      txBytes:
        '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160500fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '381dbd0632dd429795ec11e9378dad2db8f425dccaff99ba8e2a9d46c105fd0d',
    },
    invalidEdictRuneId: {
      txBytes:
        '70736274ff0100bf0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000000000001a6a5d1716000000010100fae135ec1780897a020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: 'f3dec295b50a3dba44f94451ca28ffeda18236a7a0ac392c9b9b19a78bfb02eb',
    },
    burningRunesByEdict: {
      txBytes:
        '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501014a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '82add437d82bff9704b72b18d142e6d61fd5063c5fec37e3244c9bd4d08fe35d',
    },
    invalidEdictOutput: {
      txBytes:
        '70736274ff0100bb0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501064a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '9afc6da2b46b545cb074b1717861cdb1f78849ac8a5262ee843935b172ce3db0',
    },
    noEdict: {
      txBytes:
        '70736274ff0100aa0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000056a5d0216004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c51e0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '01705a55b4be40cda8b5a5fa10f537ded2d4cf3d9d48550090e8f36303281b3c',
    },
    redundantEdict: {
      txBytes:
        '70736274ff0100c00200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000000000001b6a5d18160000fae135ec1780897a02000080897a000000e0c65b004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c5080f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: 'cc4ead3e185c8af5a97d5b199b5fb607576ffcb9eb208825122a61735e1b5590',
    },
    redundantUniversalChange: {
      txBytes:
        '70736274ff0100ce0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014a0100000000000016001487e9703e9ce7c061a965c8304c31b5a1d453292dd40d000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: '6e9988f97c40889f92cdea2dd522bbe47477b9fb9ec1fe30bb0f197a54a39c98',
    },
    overdrawnEdict: {
      txBytes:
        '70736274ff0100bc0200000001467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000176a5d14160000fae135ec178092f401020000e0cfd501004a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c50d0f000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '3c5d033053ca047676e090f8279dcbdde8c4e2a92e9c892899a3ebca83d64e2d',
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

export const transaction2HashMessage0 =
  '6c4371604cdb25f8e3099942fbfebdd278d6df67e2378a5bd7730b1e0db520ce';
export const transaction2HashMessage1 =
  '0b64e1a9514dc25f44f230b2c3a2e16762d41fde9152ea89104885b896f1265b';

export const transaction2Forms = {
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
      "{\\"txId\\":\\"f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98\\",\\"index\\":0,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f\\",\\"index\\":2,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880891:4054\\",\\"quantity\\":1000}]}"
    ]
  }`,
  txData: {
    valid: {
      txBytes:
        '70736274ff0100f70200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014a01000000000000160014ef22b328723e7c6d096245b2197d550d9de1c3174c22000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: 'e97c45724c95d6584fbde521373d076e2744300314eefd5dfc31f4dd484c2cc8',
    },
    withoutRequiredUniversalChange: {
      txBytes:
        '70736274ff0100d80200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff042601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a020000e0cfd501004a01000000000000160014728563c848aecfc85bb635219a1fb19796596bdb6b22000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000',
      txId: '684bbbdd9ce8e4a249e8292df890b58ec1d018f71071e481825be619cb604bea',
    },
    hasUnexpectedEdict: {
      txBytes:
        '70736274ff0100fdfd000200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c00000000000000001c6a5d19160000fae135ec1780897a030000e0cfd5010101d61fe807004a01000000000000160014d4850984e10810dc789f5f2f106e6e4bdf1606794722000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: '32480bcd950f7f41b4a01760e8745bf3ca2bda6dffb5a85fd1a0c6b0d13af4b6',
    },
    wrongTransferringRuneChangeScript: {
      txBytes:
        '70736274ff0100f70200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c26010000000000001600147d3c57560aa858c055d34a6713ef68a6266623580000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014a010000000000001600147d3c57560aa858c055d34a6713ef68a6266623584c22000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: '98d80d8ed2b7cac4da81d6b17aee60051ea8c987986af6ff28becfe9a8b2c586',
    },
    wrongOpReturnIndex: {
      txBytes:
        '70736274ff0100f70200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c4a010000000000001600148a585f706d777eb1de75f9df5b3cf8047bf1d0ab0000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014c22000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: 'ffd7b48ad57833b37a3f8ba92e5674de127bf227074eb81012786aa81972f15a',
    },
    wrongBtcChangeScript: {
      txBytes:
        '70736274ff0100f70200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014a01000000000000160014fc764ac92748124dafa55421f84ba1347622e9734c22000000000000160014fc764ac92748124dafa55421f84ba1347622e973000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000',
      txId: '334aeab1de347120fed29227305ace7cbaa24b0bf1e6a7c95907d501501aba48',
    },
  },
};
export const transaction2SignedTxBytesHex =
  '70736274ff0100f70200000002982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a030000e0cfd501014a01000000000000160014ef22b328723e7c6d096245b2197d550d9de1c3174c22000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086c02483045022100e269580b04942f6bf47cc9c543119d160ef0f7d384dc1553d6f589c8452b58a102203a99d17f37005b52e738ca2e838a4d90b9793495f0bee9d2e308c0299b4d31b601210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c01086b024730440220768881a88dcd223b6d64f077f0cb810215913a01f2b61f388d548a74b5f684c60220740638b86647198d68b92bf1ef26004331f982de999b44d84a61a867dbdb64bd01210355e0dedac981e4e9c1138c797e2a542f89ede877cea83ef72e40c35f4ad7ca9f000000000000';

export const transaction3PaymentTransaction = `{
  "network": "bitcoin-runes",
  "eventId": "",
  "txBytes": "70736274ff0100fd2c010200000003467c804e164eceac8c397e72cf3dacde1ae8afbae8081b312912f54e6ee3a4f10000000000ffffffff982dd9387197baf7a266197ebd403646b12377dbc2dffd67953f871d08babbf50000000000ffffffff0fed7c0fe0559722682c36797eda620e3b4b0261033f392a231c0af28123bfa50200000000ffffffff052601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c2601000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0000000000000000166a5d13160000fae135ec1780897a030000c0a8a504014a010000000000002251207b5df19c547450449eea7e5a1c57197bbece0761f8971663ae0ce91c65eda6c55134000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000001011f5412000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c0001011f8813000000000000160014b04d7f7f48f2f6b9ffcfceb205d48c8935c1418c000000000000",
  "txId": "6c3b695751a19cdaf2550cc53571037081b40aedb733e301e8acd1e1fd02001b",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"f1a4e36e4ef51229311b08e8baafe81adeac3dcf727e398cacce4e164e807c46\\",\\"index\\":0,\\"value\\":4692,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"f5bbba081d873f9567fddfc2db7723b1463640bd7e1966a2f7ba977138d92d98\\",\\"index\\":0,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880890:3052\\",\\"quantity\\":5500000}]}","{\\"txId\\":\\"a5bf2381f20a1c232a393f0361024b3b0e62da7e79362c68229755e00f7ced0f\\",\\"index\\":2,\\"value\\":5000,\\"runes\\":[{\\"runeId\\":\\"880891:4054\\",\\"quantity\\":1000}]}"
  ]
}`;
export const transaction3Order: PaymentOrder = [
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

export const mockedColdOrder: PaymentOrder = [
  {
    address: 'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
    assets: {
      nativeToken: 330n,
      tokens: [
        {
          id: '880890:3052',
          value: 6000000n,
        },
        {
          id: '880891:4054',
          value: 500n,
        },
      ],
    },
  },
];
export const splittedColdOrder: PaymentOrder = [
  {
    address: 'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
    assets: {
      nativeToken: 330n,
      tokens: [
        {
          id: '880890:3052',
          value: 6000000n,
        },
      ],
    },
  },
  {
    address: 'bc1p0dwlr8z5w3gyf8h20edpc4ce0wlvupmplzt3vcawpn53ce0d5mzsty8deu',
    assets: {
      nativeToken: 330n,
      tokens: [
        {
          id: '880891:4054',
          value: 500n,
        },
      ],
    },
  },
];
export const remainingAssetsAfterCold = [
  {
    nativeToken: 8374n, // two min native-segwit value and fee (400 satoshi) are reduced from it
    tokens: [
      {
        id: '880890:3052',
        value: 5000000n,
      },
    ],
  },
  {
    nativeToken: 3682n, // two min native-segwit value and fee (400 satoshi) are reduced from it
    tokens: [
      {
        id: '880891:4054',
        value: 500n,
      },
    ],
  },
];
