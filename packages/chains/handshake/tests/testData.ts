import { RosenTokens } from '@rosen-bridge/tokens';

export const lockAddress = 'hs1qjrhz7jx4u0ded366rm780h82c8c5n2rfcrgpx2';
export const lockAddressPublicKey =
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335';
// 2-of-3 multisig witness script for P2WSH testing
// Format: OP_2 pubkey1 pubkey2 pubkey3 OP_3 OP_CHECKMULTISIG
export const lockScript =
  '522102' +
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335' +
  '2102' +
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335' +
  '2102' +
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335' +
  '53ae';

// Test token map
export const testTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId:
        '1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4',
      name: 'testHNS',
      decimals: 6,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    handshake: {
      tokenId: 'hns',
      name: 'HNS',
      decimals: 6,
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
        '1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4',
      name: 'testHNS',
      decimals: 3,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    handshake: {
      tokenId: 'hns',
      name: 'HNS',
      decimals: 6,
      type: 'native',
      residency: 'native',
      extra: {},
    },
  },
];

// Test UTXOs for lock address
export const lockAddressUtxos = [
  {
    txId: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
    index: 0,
    value: 10000000n, // 10 HNS
  },
  {
    txId: 'ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba',
    index: 1,
    value: 5000000n, // 5 HNS
  },
];

// Payment transaction test data
export const transaction1InputIds = [
  'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470.0',
];

export const transaction1Order = [
  {
    address: 'hs1qrk5xfaxdk4mhem8rljr5k0yvkaxn6vzvh7mh04',
    assets: {
      nativeToken: 1000000n, // 1 HNS
      tokens: [],
    },
  },
];

// Serialized Handshake MTX for testing (simplified)
export const transaction1PaymentTransaction = JSON.stringify({
  network: 'handshake',
  txId: '5719ca8aa55f334e023a4468a82eaacc6f54affdbfece2d43780c94bc28d02da',
  eventId: 'event1',
  txBytes:
    '0000000001c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f247000000000ffffffff0240420f000000000000141da864f4cdb5777cece3fc874b3c8cb74d3d304c00005850890000000000001490ee2f48d5e3db96c75a1efc77dceac1f149a86900000000000000',
  txType: 'payment',
  inputUtxos: [
    '{"txId":"c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470","index":0,"value":"10000000"}',
  ],
});

export const transaction2Order = [
  {
    address: 'hs1qrk5xfaxdk4mhem8rljr5k0yvkaxn6vzvh7mh04',
    assets: {
      nativeToken: 2000000n, // 2 HNS
      tokens: [],
    },
  },
];

export const transaction2WrappedOrder = [
  {
    address: 'hs1qrk5xfaxdk4mhem8rljr5k0yvkaxn6vzvh7mh04',
    assets: {
      nativeToken: 2000n, // 2 HNS with wrapped decimals (3)
      tokens: [],
    },
  },
];

export const transaction2PaymentTransaction = JSON.stringify({
  network: 'handshake',
  txId: '966bc5def97d7b8817954544bed4c1c487b08a0d1a74dbce565e82da46a79641',
  eventId: 'event2',
  txBytes:
    '0000000002c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f247000000000ffffffffac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba01000000ffffffff0280841e000000000000141da864f4cdb5777cece3fc874b3c8cb74d3d304c0000645cc60000000000001490ee2f48d5e3db96c75a1efc77dceac1f149a8690000000000000000',
  txType: 'payment',
  inputUtxos: [
    '{"txId":"c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470","index":0,"value":"10000000"}',
    '{"txId":"ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba","index":1,"value":"5000000"}',
  ],
});

export const transaction2Assets = {
  inputAssets: {
    nativeToken: 15000000n,
    tokens: [],
  },
  outputAssets: {
    nativeToken: 15000000n,
    tokens: [],
  },
};

export const transaction2WrappedAssets = {
  inputAssets: {
    nativeToken: 15000n,
    tokens: [],
  },
  outputAssets: {
    nativeToken: 15000n,
    tokens: [],
  },
};

// Signature test data for TSS signing
export const transaction2HashMessage0 =
  '34b1fc183ca504deb10ae1746860db7da555ecc0daab2aa147684ebe9dcc87a5';
export const transaction2Signature0 =
  '5775ecea4b8e18eb78ae18d77d1e239885cea219ddf9a1147c97ee29106fb01026ec267183493e900b531761cb4423bac4eee07cc630eedf32df90f7171498b1';

export const transaction2HashMessage1 =
  '84084e4cede4dbb9ceca6f36a815212bc31ad95e6b1517a122424b4a95b686d6';
export const transaction2Signature1 =
  'f1e2d3c4b5a697887960504030201001020304050607080900010203040506071112131415161718192021222324252627282930313233343536373839404142';

export const transaction2SignedTxBytesHex =
  '0000000002c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f247000000000ffffffffac7b42b9' +
  'daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba01000000ffffffff0280841e000000000000141da864' +
  'f4cdb5777cece3fc874b3c8cb74d3d304c0000645cc60000000000001490ee2f48d5e3db96c75a1efc77dceac1f149a86900' +
  '000000000002415775ecea4b8e18eb78ae18d77d1e239885cea219ddf9a1147c97ee29106fb01026ec267183493e900b53176' +
  '1cb4423bac4eee07cc630eedf32df90f7171498b101210345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c7' +
  '60fda073350241f1e2d3c4b5a69788796050403020100102030405060708090001020304050607111213141516171819202122' +
  '232425262728293031323334353637383940414201210345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760' +
  'fda07335';

export const transaction0Input0BoxId =
  'aaaaaaa536b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85baa.0';

export const transaction0PaymentTransaction = JSON.stringify({
  network: 'handshake',
  txId: '708a25645524e7ae72529dd2446ef18f6a7c6253fee7c7ad77773e4f97d83b17',
  eventId: 'event0',
  txBytes:
    '0000000001aaaaaaa536b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85baa00000000ffffffff0140420f000000000000141da864f4cdb5777cece3fc874b3c8cb74d3d304c00000000000000',
  txType: 'payment',
  inputUtxos: [
    '{"txId":"aaaaaaa536b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85baa","index":0,"value":"5000000"}',
  ],
});
