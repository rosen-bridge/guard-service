export const lockAddress = 'hs1qlhlqd2lvdft9alekqndnplfsq6dj723hk4vx86';

export const blockHeight = 150000;
export const blockHash =
  '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e';

export const chainInfo = {
  chain: 'main',
  blocks: 150000,
  headers: 150000,
  bestblockhash:
    '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  treeroot: '0000000000000000000000000000000000000000000000000000000000000000',
  difficulty: 1234567.89,
  mediantime: 1706930825,
  verificationprogress: 0.999999,
  chainwork: '000000000000000000000000000000000000000000000001234567890abcdef0',
  pruned: false,
  softforks: {},
  deflationary: false,
  pruneheight: null,
};

export const blockSummary = {
  hash: '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  height: 150000,
  time: 1706930825,
  previousblockhash:
    '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56',
  tx: [
    '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
    'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
  ],
  confirmations: 49,
  difficulty: 1234567.89,
  merkleroot:
    'd2de1afdccbc6dcfbee076cece7b1d2f82b79fb6b630075d203d30b8b63fb259',
  witnessroot: 'a1b2c3d4e5f6071819202122232425262728292a2b2c2d2e2f303132333435',
  treeroot: '0000000000000000000000000000000000000000000000000000000000000000',
  nonce: 149001495,
  size: 1004368,
  weight: 3993334,
  version: 536870912,
  versionHex: '20000000',
  chainwork: '000000000000000000000000000000000000000000000001234567890abcdef0',
  bits: '1a00ffff',
  mediantime: 1706929338,
  nextblockhash:
    '00000000000000000001c5d03a239563c5a947d325c526bf140c7663b989b57',
};

export const blockInfo = {
  hash: '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  parentHash:
    '000000000000000000000cde53a239563c5a947d325c526bf140c7663b989b56',
  height: 150000,
};

export const txId =
  '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3';
export const txBlockHash =
  '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e';

// RPC response for a Handshake transaction (coin-only, covenant type 0)
export const rpcTxResponse = {
  txid: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  hash: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  version: 0,
  size: 415,
  vsize: 415,
  weight: 1660,
  locktime: 0,
  vin: [
    {
      txid: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      vout: 1,
      scriptSig: {
        asm: '',
        hex: '',
      },
      txinwitness: [
        '304402205775ecea4b8e18eb78ae18d77d1e239885cea219ddf9a1147c97ee29106fb010022026ec267183493e900b531761cb4423bac4eee07cc630eedf32df90f7171498b101',
        '02487e4741fb829d1a4cc58135868ecf68570348605a7d29417d640b8944a5d002',
      ],
      sequence: 4294967295,
      coinbase: false,
    },
  ],
  vout: [
    {
      value: 0.000294, // 294 dollarydoos (6 decimals for HNS)
      n: 0,
      address: {
        version: 0,
        hash: 'cdc1cde2e417b586bd714f64afc3d7def41b6b15',
        string: 'hs1qehqumchyz76cd0t3faj2ls7hmm6pkec45h4l9c',
      },
      covenant: {
        type: 0, // NONE = coin transaction
        action: 'NONE',
        items: [],
      },
    },
    {
      value: 17.556669, // 17556669 dollarydoos
      n: 1,
      address: {
        version: 0,
        hash: '45d7a5c4458e1b989a01c8e1dd5907febaea6f5b',
        string: 'hs1pght6t3z93cde3xspersa6kg8l6aw5m6m77r3hd',
      },
      covenant: {
        type: 0, // NONE = coin transaction
        action: 'NONE',
        items: [],
      },
    },
  ],
  hex: '00000000010170246f92140c93bab5428adf905aa9588d4e9ba72c854563e09a58df34fdda...',
  blockhash: '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  confirmations: 49,
  time: 1709554372,
  blocktime: 1709554372,
  blockheight: 150000,
};

// Transaction with name covenant (should be filtered out)
export const rpcTxWithNameCovenant = {
  txid: 'aaaa4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53aa',
  hash: 'aaaa4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53aa',
  version: 0,
  size: 415,
  vsize: 415,
  weight: 1660,
  locktime: 0,
  vin: [
    {
      txid: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      vout: 0,
      scriptSig: {
        asm: '',
        hex: '',
      },
      txinwitness: [],
      sequence: 4294967295,
      coinbase: false,
    },
  ],
  vout: [
    {
      value: 0.0001, // Coin output
      n: 0,
      address: {
        version: 0,
        hash: 'cdc1cde2e417b586bd714f64afc3d7def41b6b15',
        string: 'hs1qehqumchyz76cd0t3faj2ls7hmm6pkec45h4l9c',
      },
      covenant: {
        type: 0, // NONE
        action: 'NONE',
        items: [],
      },
    },
    {
      value: 0.0, // Name output
      n: 1,
      address: {
        version: 0,
        hash: '45d7a5c4458e1b989a01c8e1dd5907febaea6f5b',
        string: 'hs1pght6t3z93cde3xspersa6kg8l6aw5m6m77r3hd',
      },
      covenant: {
        type: 2, // OPEN (name-related covenant, should be filtered)
        action: 'OPEN',
        items: ['6e616d65', '00000001'],
      },
    },
  ],
  blockhash: '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  confirmations: 10,
  time: 1709554372,
  blocktime: 1709554372,
  blockheight: 149990,
};

export const txConfirmation = 1; // blockHeight (150000) - tx blockheight (150000) + 1 = 1

// Expected HandshakeTx format (after conversion)
export const handshakeTx = {
  id: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  inputs: [
    {
      txId: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      index: 1,
    },
  ],
  outputs: [
    {
      value: 294n,
      address: {
        version: 0,
        hash: 'cdc1cde2e417b586bd714f64afc3d7def41b6b15',
        string: 'hs1qehqumchyz76cd0t3faj2ls7hmm6pkec45h4l9c',
      },
    },
    {
      value: 17556669n,
      address: {
        version: 0,
        hash: '45d7a5c4458e1b989a01c8e1dd5907febaea6f5b',
        string: 'hs1pght6t3z93cde3xspersa6kg8l6aw5m6m77r3hd',
      },
    },
  ],
};

// Expected HandshakeTx with filtered covenant (only coin output)
export const handshakeTxWithFilteredCovenant = {
  id: 'aaaa4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53aa',
  inputs: [
    {
      txId: 'c5dafd34df589ae06345852ca79b4e8d58a95a90df8a42b5ba930c14926f2470',
      index: 0,
    },
  ],
  outputs: [
    {
      value: 100n, // 0.0001 HNS = 100 dollarydoos
      address: {
        version: 0,
        hash: 'cdc1cde2e417b586bd714f64afc3d7def41b6b15',
        string: 'hs1qehqumchyz76cd0t3faj2ls7hmm6pkec45h4l9c',
      },
    },
  ],
};

// Unconfirmed transaction
export const unconfirmedRpcTxResponse = {
  ...rpcTxResponse,
  txid: '5f753368e7eeaa3e8629ce3f826fe8dfac1fd628ccd6651c87fe2ead18fd8249',
  blockhash: undefined,
  confirmations: 0,
  blockheight: undefined,
};

export const txIds = [
  '716587ea99237f4e1bf6f959b3f8f4227f42c593a91356fa3fb5c49b310caa49',
  'd67242cb1be722aa50d6802a2d9f2ee9948836ec3d9278658f5a1573fcacc5aa',
  'be36bc00ea47873fb6067f779cb5bd988dddbf50193e2311a0773133083eea33',
];

// gettxout response (for unspent box)
export const getTxOutResponse = {
  bestblock: '00000000000019cdc26c9e74e6dbdf6e0e14e8bec85c2b9bf40e7d49b6b48f1e',
  confirmations: 100,
  value: 0.000294,
  address: {
    version: 0,
    hash: 'cdc1cde2e417b586bd714f64afc3d7def41b6b15',
    string: 'hs1qehqumchyz76cd0t3faj2ls7hmm6pkec45h4l9c',
  },
  covenant: {
    type: 0, // NONE = coin
    action: 'NONE',
    items: [],
  },
  coinbase: false,
};

// gettxout response for name covenant (should return false for isBoxUnspentAndValid)
export const getTxOutResponseWithNameCovenant = {
  ...getTxOutResponse,
  covenant: {
    type: 2, // OPEN
    action: 'OPEN',
    items: ['6e616d65'],
  },
};

export const utxo = {
  txId: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
  index: 0,
  value: 294n,
};

// estimatefee response - returns just the fee rate (HNS per KB)
export const estimateFeeResponse = 0.001024; // 0.001024 HNS/KB = 1024 dollarydoos/KB

export const targetFeeEstimation = 1; // Ceil(1024 / 1024) = 1 dollarydoo per byte

// Wallet RPC listunspent response
export const walletListUnspentResponse = [
  {
    txid: '7c53537a189f91e74a4a9c56f1655827ac358187573bd644b1e974ebef374a5c',
    vout: 0,
    amount: 0.0006, // 600 dollarydoos (6 decimals)
    confirmations: 100,
    covenant: {
      type: 0, // NONE = coin
      action: 'NONE',
    },
  },
  {
    txid: 'ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba',
    vout: 2,
    amount: 29.989144, // 29989144 dollarydoos
    confirmations: 50,
    covenant: {
      type: 0, // NONE = coin
      action: 'NONE',
    },
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

export const addressBalance = 29989744n; // 600 + 29989144

// Wallet RPC response with mixed coin and name covenants
export const walletListUnspentWithNamesResponse = [
  {
    txid: '7c53537a189f91e74a4a9c56f1655827ac358187573bd644b1e974ebef374a5c',
    vout: 0,
    amount: 0.0006, // 600 dollarydoos (coin)
    confirmations: 100,
    covenant: {
      type: 0, // NONE = coin
      action: 'NONE',
    },
  },
  {
    txid: 'bbbb42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfedbbbb',
    vout: 1,
    amount: 10.0, // 10 HNS (name-related, should be filtered)
    confirmations: 50,
    covenant: {
      type: 2, // OPEN = name operation
      action: 'OPEN',
    },
  },
  {
    txid: 'ac7b42b9daebc8e9df6dc50a909fbdc18b750411694750ac87d8ada11dfed3ba',
    vout: 2,
    amount: 29.989144, // 29989144 dollarydoos (coin)
    confirmations: 50,
    covenant: {
      type: 0, // NONE = coin
      action: 'NONE',
    },
  },
];

export const addressUtxosCoinsOnly = [
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

export const addressBalanceCoinsOnly = 29989744n; // Only coins: 600 + 29989144 (name UTXO filtered out)
