export const lockAddress = 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN';
export const lockAddressPublicKey =
  '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac';

export const blockHeight = 5434656;
export const blockHash =
  'e4dc98a8e1faabf2c210e487027f1380a39a83cc22d7d7e38592f0ac30e0e847';
export const blockResponse = {
  id: 'e4dc98a8e1faabf2c210e487027f1380a39a83cc22d7d7e38592f0ac30e0e847',
  height: 5434656,
  version: 6422788,
  timestamp: 1729891705,
  tx_count: 25,
  size: 6970,
  weight: 27880,
  merkle_root:
    '58e56706160fb162eb07de7b4101fe69a74070b1051c8413f785b7029423cc47',
  previousblockhash:
    '7e1c0b269757d346b2b30183904ce70051f3dbac41fba1c5b467899fa2645fee',
  mediantime: 1729891559,
  nonce: 0,
  bits: 436250374,
  difficulty: 25714365.745825343,
};
export const blockInfo = {
  hash: 'e4dc98a8e1faabf2c210e487027f1380a39a83cc22d7d7e38592f0ac30e0e847',
  parentHash:
    '7e1c0b269757d346b2b30183904ce70051f3dbac41fba1c5b467899fa2645fee',
  height: 5434656,
};

export const txId =
  'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab';
export const txBlockHash =
  '5b1c666ef6ba36cda85e7d1ced54d43e1dfd30b31a9f071279b70a470a08ae2c';
export const txResponse = {
  txid: 'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: '8597e2de38e3b1e69db9b8a80463e149317e91f904df5d6fa26b71b962f29e34',
      vout: 2,
      prevout: {
        scriptpubkey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
        scriptpubkey_asm:
          'OP_DUP OP_HASH160 OP_PUSHBYTES_20 872b67c8270a9eaf5c2abf632af3dea989d2e371 OP_EQUALVERIFY OP_CHECKSIG',
        scriptpubkey_type: 'p2pkh',
        scriptpubkey_address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
        value: 15534394312,
      },
      scriptsig:
        '47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037',
      scriptsig_asm:
        'OP_PUSHBYTES_71 304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae12801 OP_PUSHBYTES_33 022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037',
      is_coinbase: false,
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      scriptpubkey:
        '6a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff36',
      scriptpubkey_asm:
        'OP_RETURN OP_PUSHBYTES_51 000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff36',
      scriptpubkey_type: 'op_return',
      value: 0,
    },
    {
      scriptpubkey: 'a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887',
      scriptpubkey_asm:
        'OP_HASH160 OP_PUSHBYTES_20 d4c141068ab3a242aed5081a27ac3f10ad99ac98 OP_EQUAL',
      scriptpubkey_type: 'p2sh',
      scriptpubkey_address: 'ABqDRagXMAqcwxeqnvSZKGKBAqjFBiFcU4',
      value: 1000000000,
    },
    {
      scriptpubkey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
      scriptpubkey_asm:
        'OP_DUP OP_HASH160 OP_PUSHBYTES_20 872b67c8270a9eaf5c2abf632af3dea989d2e371 OP_EQUALVERIFY OP_CHECKSIG',
      scriptpubkey_type: 'p2pkh',
      scriptpubkey_address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
      value: 14494394312,
    },
  ],
  size: 285,
  weight: 1140,
  fee: 40000000,
  status: {
    confirmed: true,
    block_height: 5425056,
    block_hash:
      '5b1c666ef6ba36cda85e7d1ced54d43e1dfd30b31a9f071279b70a470a08ae2c',
    block_time: 1729287853,
  },
};
export const txConfirmation = 9600;
export const dogePaymentBytes =
  '70736274ff0100b30200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee297850200000000ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100fd1d010200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee29785020000006a47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac0000000000000000';
export const dogeTx = {
  id: 'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab',
  inputs: [
    {
      txId: '8597e2de38e3b1e69db9b8a80463e149317e91f904df5d6fa26b71b962f29e34',
      index: 2,
      scriptPubKey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
    },
  ],
  outputs: [
    {
      scriptPubKey:
        '6a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff36',
      value: 0n,
    },
    {
      scriptPubKey: 'a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887',
      value: 1000000000n,
    },
    {
      scriptPubKey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
      value: 14494394312n,
    },
  ],
};
export const unconfirmedTxResponse = {
  txid: 'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: '8597e2de38e3b1e69db9b8a80463e149317e91f904df5d6fa26b71b962f29e34',
      vout: 2,
      prevout: {
        scriptpubkey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
        scriptpubkey_asm:
          'OP_DUP OP_HASH160 OP_PUSHBYTES_20 872b67c8270a9eaf5c2abf632af3dea989d2e371 OP_EQUALVERIFY OP_CHECKSIG',
        scriptpubkey_type: 'p2pkh',
        scriptpubkey_address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
        value: 15534394312,
      },
      scriptsig:
        '47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037',
      scriptsig_asm:
        'OP_PUSHBYTES_71 304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae12801 OP_PUSHBYTES_33 022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037',
      is_coinbase: false,
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      scriptpubkey:
        '6a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff36',
      scriptpubkey_asm:
        'OP_RETURN OP_PUSHBYTES_51 000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff36',
      scriptpubkey_type: 'op_return',
      value: 0,
    },
    {
      scriptpubkey: 'a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887',
      scriptpubkey_asm:
        'OP_HASH160 OP_PUSHBYTES_20 d4c141068ab3a242aed5081a27ac3f10ad99ac98 OP_EQUAL',
      scriptpubkey_type: 'p2sh',
      scriptpubkey_address: 'ABqDRagXMAqcwxeqnvSZKGKBAqjFBiFcU4',
      value: 1000000000,
    },
    {
      scriptpubkey: '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac',
      scriptpubkey_asm:
        'OP_DUP OP_HASH160 OP_PUSHBYTES_20 872b67c8270a9eaf5c2abf632af3dea989d2e371 OP_EQUALVERIFY OP_CHECKSIG',
      scriptpubkey_type: 'p2pkh',
      scriptpubkey_address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
      value: 14494394312,
    },
  ],
  size: 285,
  weight: 1140,
  fee: 40000000,
  status: {
    confirmed: false,
  },
};

export const addressResponse = {
  address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
  chain_stats: {
    funded_txo_count: 14,
    funded_txo_sum: 112731760184,
    spent_txo_count: 6,
    spent_txo_sum: 97187365872,
    tx_count: 9,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
};
export const addressBalance = 15544394312n;
export const emptyAddressResponse = {
  address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
  chain_stats: {
    funded_txo_count: 1,
    funded_txo_sum: 541840,
    spent_txo_count: 1,
    spent_txo_sum: 541840,
    tx_count: 2,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
};
export const unusedAddressResponse = {
  address: 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
  chain_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
};

export const txIds = [
  '716587ea99237f4e1bf6f959b3f8f4227f42c593a91356fa3fb5c49b310caa49',
  'd67242cb1be722aa50d6802a2d9f2ee9948836ec3d9278658f5a1573fcacc5aa',
  'be36bc00ea47873fb6067f779cb5bd988dddbf50193e2311a0773133083eea33',
  '3432409bb4094739122e2f49c386ab4a86451a55ed95ebd19315fc048ff444e5',
  'baaacc564ace500045d1744a57aaccdb9b601e5b4f5c2c06bcd4af0ce5b99a10',
  'c6bf107d6226a71c5b64ea500f7169b9a546eeb0898311f9b8dcf44f096f4d7d',
];

export const addressUtxoResponse = [
  {
    txid: 'bc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    vout: 1,
    status: {
      confirmed: true,
      block_height: 5427984,
      block_hash:
        'fb7a521ddd47397ba421276bd298828527d7f1803eba7e530c1e336fef0f8c0d',
      block_time: 1729471417,
    },
    value: 900000000,
  },
];
export const addressUtxos = [
  {
    txId: 'bc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    index: 1,
    value: 900000000n,
  },
];

export const txOutspendsResponse = [
  {
    spent: true,
    txid: '57e186f988953145b8f20a71219839ed018715fcdc5fedec94874e1cbe532cc7',
    vin: 3,
    status: {
      confirmed: true,
      block_height: 828669,
      block_hash:
        '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56',
      block_time: 1706930825,
    },
  },
  {
    spent: false,
  },
];

export const utxo = {
  txId: 'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab',
  index: 0,
  value: 0n,
};

export const spentTxId =
  '79e657a92547e0a67ad4b0f04777ddb617745e6064b1d9393583619da59ae4c6';
export const spentIndex = 1;
export const spentResult = {
  spent: true,
  txid: '79e657a92547e0a67ad4b0f04777ddb617745e6064b1d9393583619da59ae4c6',
  vin: 0,
  status: {
    confirmed: true,
    block_height: 5425068,
    block_hash:
      '2e21903ce31a5b77e9a0f56255a92955cb018504e0647b99211833ae721ae15f',
    block_time: 1729288618,
  },
};

export const unsignedTxId =
  '2e21903ce31a5b77e9a0f56255a92955cb018504e0647b99211833ae721ae15f';
export const unspentBoxId =
  'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab.0';
export const unspentTxId =
  'd3d2b2dc24639e8d698071a49921b7b378c0a56cffcc0db3b42d5937a67389ab';
export const unspentIndex = 0;
export const unspentResult = {
  spent: false,
};

export const feeEstimatesResponse = {
  '1': 50271.918000000005,
  '2': 50271.918000000005,
  '3': 50271.918000000005,
  '4': 50271.918000000005,
  '5': 36171.68,
  '6': 36171.68,
  '7': 3011.257,
  '8': 3011.257,
  '9': 3011.257,
  '10': 3011.257,
  '11': 3011.257,
  '12': 3011.257,
  '13': 3011.257,
  '14': 3011.257,
  '15': 3011.257,
  '16': 1002.715,
  '17': 1002.715,
  '18': 1002.715,
  '19': 1002.715,
  '20': 1002.715,
  '21': 1002.715,
  '22': 1002.715,
  '23': 1002.715,
  '24': 1002.715,
  '25': 1002.715,
};
export const targetFeeEstimation = 3011.257;

export const unsortedAddressUtxoResponse = [
  {
    txid: 'cc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    vout: 2,
    status: {
      confirmed: true,
      block_height: 5427984,
      block_hash:
        'fb7a521ddd47397ba421276bd298828527d7f1803eba7e530c1e336fef0f8c0d',
      block_time: 1729471417,
    },
    value: 800000000,
  },
  {
    txid: 'bc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    vout: 1,
    status: {
      confirmed: true,
      block_height: 5427984,
      block_hash:
        'fb7a521ddd47397ba421276bd298828527d7f1803eba7e530c1e336fef0f8c0d',
      block_time: 1729471417,
    },
    value: 900000000,
  },
  {
    txid: 'cc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    vout: 0,
    status: {
      confirmed: true,
      block_height: 5427984,
      block_hash:
        'fb7a521ddd47397ba421276bd298828527d7f1803eba7e530c1e336fef0f8c0d',
      block_time: 1729471417,
    },
    value: 700000000,
  },
];

export const sortedAddressUtxos = [
  {
    txId: 'bc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    index: 1,
    value: 900000000n,
  },
  {
    txId: 'cc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    index: 0,
    value: 700000000n,
  },
  {
    txId: 'cc9c558b21c86f955e07af14b73e82939731ca6ffd0b28c5b72436d76cee881f',
    index: 2,
    value: 800000000n,
  },
];
