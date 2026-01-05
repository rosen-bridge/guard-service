export const lockAddress = 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt';
export const lockAddressPublicKey =
  '0345307e1165c99d12557bea11f8c8cd0f6bc057fb51952e824bc7c760fda07335';

export const blockHeight = 833150;
export const blockHash =
  '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56';
export const blockResponse = {
  id: '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56',
  height: 828669,
  version: 1073733632,
  timestamp: 1706930825,
  tx_count: 27,
  size: 1004368,
  weight: 3993334,
  merkle_root:
    'd2de1afdccbc6dcfbee076cece7b1d2f82b79fb6b630075d203d30b8b63fb259',
  previousblockhash:
    '0000000000000000000236443a3f4784ec904f5c500bd2e82838756b5657bb85',
  mediantime: 1706929338,
  nonce: 149001495,
  bits: 386120285,
  difficulty: 75502165623893,
};
export const blockInfo = {
  hash: '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56',
  parentHash:
    '0000000000000000000236443a3f4784ec904f5c500bd2e82838756b5657bb85',
  height: 828669,
};

export const txId =
  '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3';
export const txBlockHash =
  '00000000000000000002d045520eb8425f4d4fab03acd36bc6c75796d8f6cebd';
export const txResponse = {
  txid: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      vout: 1,
      prevout: {
        scriptpubkey:
          '51200c32439c47927dd455e4ba6075ea36c369cd05dd6595d00926bf49df3a04b4df',
        scriptpubkey_asm:
          'OP_PUSHNUM_1 OP_PUSHBYTES_32 0c32439c47927dd455e4ba6075ea36c369cd05dd6595d00926bf49df3a04b4df',
        scriptpubkey_type: 'v1_p2tr',
        scriptpubkey_address:
          'bc1ppsey88z8jf7ag40yhfs8t63kcd5u6pwavk2aqzfxhaya7wsykn0s3mfgyq',
        value: 17646063,
      },
      scriptsig: '',
      scriptsig_asm: '',
      witness: [
        'f74eff55af88f049c5b4b67d29a5eeb0b9d3558656fe1412e108968f126971a29e056607c1108ead207f56351676789cb1d49daa16326ee0e7fc268775fa20c7',
        '2088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff1ac0063036f726401010a746578742f706c61696e004c827b2270223a22746170222c226f70223a22646d742d6d696e74222c22646570223a22346439363761663336646361636437653631393963333962646138353564376231623337323638663463383033316665643534303361393961633537666536376930222c227469636b223a226e6174222c22626c6b223a22383333313031227d68',
        'c088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff1',
      ],
      is_coinbase: false,
      sequence: 4261412863,
    },
  ],
  vout: [
    {
      scriptpubkey: '0014cdc1cde2e417b586bd714f64afc3d7def41b6b15',
      scriptpubkey_asm:
        'OP_0 OP_PUSHBYTES_20 cdc1cde2e417b586bd714f64afc3d7def41b6b15',
      scriptpubkey_type: 'v0_p2wpkh',
      scriptpubkey_address: 'bc1qehqumchyz76cd0t3faj2ls7hmm6pk6c45h4l9c',
      value: 294,
    },
    {
      scriptpubkey:
        '512045d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b',
      scriptpubkey_asm:
        'OP_PUSHNUM_1 OP_PUSHBYTES_32 45d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b',
      scriptpubkey_type: 'v1_p2tr',
      scriptpubkey_address:
        'bc1pght6t3z93cde3xspersa6kg8l6aw5m6m77r3hd209mm2n0cus59shj4fnq',
      value: 17556669,
    },
  ],
  size: 415,
  weight: 790,
  fee: 89100,
  status: {
    confirmed: true,
    block_height: 833101,
    block_hash:
      '00000000000000000002d045520eb8425f4d4fab03acd36bc6c75796d8f6cebd',
    block_time: 1709554372,
  },
};
export const txConfirmation = 49;
export const bitcoinTx = {
  id: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  inputs: [
    {
      txId: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      index: 1,
      scriptPubKey:
        '51200c32439c47927dd455e4ba6075ea36c369cd05dd6595d00926bf49df3a04b4df',
    },
  ],
  outputs: [
    {
      scriptPubKey: '0014cdc1cde2e417b586bd714f64afc3d7def41b6b15',
      value: 294n,
    },
    {
      scriptPubKey:
        '512045d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b',
      value: 17556669n,
    },
  ],
};
export const unconfirmedTxResponse = {
  txid: '5f753368e7eeaa3e8629ce3f826fe8dfac1fd628ccd6651c87fe2ead18fd8249',
  version: 2,
  locktime: 833153,
  vin: [
    {
      txid: '0e7e944d9e3207c9c15816b522db5efa32db295471abf19a37d1f19d0ba4d067',
      vout: 0,
      prevout: {
        scriptpubkey: '76a91400a82175b1e48e4370e513cf890c4e2866be093888ac',
        scriptpubkey_asm:
          'OP_DUP OP_HASH160 OP_PUSHBYTES_20 00a82175b1e48e4370e513cf890c4e2866be0938 OP_EQUALVERIFY OP_CHECKSIG',
        scriptpubkey_type: 'p2pkh',
        scriptpubkey_address: '114UQvi1CpxN4mDAzoQu34RM3vptvK1j3d',
        value: 220889,
      },
      scriptsig:
        '47304402205775ecea4b8e18eb78ae18d77d1e239885cea219ddf9a1147c97ee29106fb010022026ec267183493e900b531761cb4423bac4eee07cc630eedf32df90f7171498b1012102487e4741fb829d1a4cc58135868ecf68570348605a7d29417d640b8944a5d002',
      scriptsig_asm:
        'OP_PUSHBYTES_71 304402205775ecea4b8e18eb78ae18d77d1e239885cea219ddf9a1147c97ee29106fb010022026ec267183493e900b531761cb4423bac4eee07cc630eedf32df90f7171498b101 OP_PUSHBYTES_33 02487e4741fb829d1a4cc58135868ecf68570348605a7d29417d640b8944a5d002',
      is_coinbase: false,
      sequence: 4294967293,
    },
  ],
  vout: [
    {
      scriptpubkey: 'a914a733fca75398a66daa494d1575b69ad9c682fe2d87',
      scriptpubkey_asm:
        'OP_HASH160 OP_PUSHBYTES_20 a733fca75398a66daa494d1575b69ad9c682fe2d OP_EQUAL',
      scriptpubkey_type: 'p2sh',
      scriptpubkey_address: '3Gw73hEempkoTG4Y3tLgvzxcQE2K9P6KL1',
      value: 100000,
    },
    {
      scriptpubkey: '76a914827fe5b4a7a06cff78cea3e91bd04098a68382ca88ac',
      scriptpubkey_asm:
        'OP_DUP OP_HASH160 OP_PUSHBYTES_20 827fe5b4a7a06cff78cea3e91bd04098a68382ca OP_EQUALVERIFY OP_CHECKSIG',
      scriptpubkey_type: 'p2pkh',
      scriptpubkey_address: '1Cu24Q3XWUd7AXvHwCJQLmzQLBhdmFCpGH',
      value: 105600,
    },
  ],
  size: 223,
  weight: 892,
  fee: 15289,
  status: {
    confirmed: false,
  },
};

export const addressResponse = {
  address: 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt',
  chain_stats: {
    funded_txo_count: 235,
    funded_txo_sum: 4993840244,
    spent_txo_count: 172,
    spent_txo_sum: 3953305887,
    tx_count: 236,
  },
  mempool_stats: {
    funded_txo_count: 0,
    funded_txo_sum: 0,
    spent_txo_count: 0,
    spent_txo_sum: 0,
    tx_count: 0,
  },
};
export const addressBalance = 1040534357n;
export const emptyAddressResponse = {
  address: 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt',
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
  address: 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrt',
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
    txid: '7c53537a189f91e74a4a9c56f1655827ac358187573bd644b1e974ebef374a5c',
    vout: 0,
    status: {
      confirmed: true,
      block_height: 812298,
      block_hash:
        '00000000000000000003c0c7224d6657fa240e313d6937179e14aa97785440af',
      block_time: 1697365545,
    },
    value: 600,
  },
  {
    txid: 'ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba',
    vout: 2,
    status: {
      confirmed: true,
      block_height: 816557,
      block_hash:
        '000000000000000000025aab6ceddecc5d187eaad1bb8ae95fde432946927af2',
      block_time: 1699847111,
    },
    value: 29989144,
  },
];
export const addressUtxos = [
  {
    txId: '7c53537a189f91e74a4a9c56f1655827ac358187573bd644b1e974ebef374a5c',
    index: 0,
    value: 600n,
  },
  {
    txId: 'ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba',
    index: 2,
    value: 29989144n,
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
  txId: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  index: 0,
  value: 294n,
};

export const feeEstimatesResponse = {
  '1': 91.249,
  '2': 91.249,
  '3': 91.249,
  '4': 86.966,
  '5': 86.966,
  '6': 82.723,
  '7': 82.723,
  '8': 82.723,
  '9': 82.723,
  '10': 82.723,
  '11': 82.723,
  '12': 79.02799999999999,
  '13': 79.02799999999999,
  '14': 79.02799999999999,
  '15': 79.02799999999999,
  '16': 75.132,
  '17': 75.132,
  '18': 71.366,
  '19': 71.366,
  '20': 71.366,
  '21': 71.366,
  '22': 67.981,
  '23': 67.981,
  '24': 67.981,
  '25': 67.981,
  '144': 13.006000000000002,
  '504': 10.606,
  '1008': 10.606,
};
export const targetFeeEstimation = 82.723;
