import { AssetBalance } from '@rosen-chains/abstract-chain';
import { BitcoinRunesTx, BitcoinRunesUtxo } from '@rosen-chains/bitcoin-runes';

export const RPC_URL = 'rpc';
export const UNISAT_URL = 'unisat';

export const requestId =
  '69a3cb2bf00dccf70d49f8ca02b94fb8546a4601c3ad9562ccefa63a0f045c50';

export const blockHeight = 911497;
export const blockchainInfoResponse = {
  result: {
    chain: 'main',
    blocks: 911497,
    headers: 911497,
    bestblockhash:
      '000000000000000000012a3403f8a799a54a136bbc9b24ff7f99f9657221628f',
    bits: '17022b91',
    target: '000000000000000000022b910000000000000000000000000000000000000000',
    difficulty: 129699156960680.9,
    time: 1756047570,
    mediantime: 1756044026,
    verificationprogress: 0.99999885154409,
    initialblockdownload: false,
    chainwork:
      '0000000000000000000000000000000000000000dcc6631dd6aedf1e691d4b6c',
    size_on_disk: 775932597297,
    pruned: false,
    warnings: '',
  },
  error: null,
  id: requestId,
};

export const txId =
  '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3';
export const txConfirmation = 78520;
export const rawTransactionResponse = {
  result: {
    txid: '0dbf4436b3493c08b85f11755f672f2b40beddb8f2b65c6bb1e68074c85b53f3',
    hash: '61591937f989b58d282f2967d02427a6b3d66170a7ea6144fcab54447b532a69',
    version: 2,
    size: 415,
    vsize: 198,
    weight: 790,
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
          'f74eff55af88f049c5b4b67d29a5eeb0b9d3558656fe1412e108968f126971a29e056607c1108ead207f56351676789cb1d49daa16326ee0e7fc268775fa20c7',
          '2088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff1ac0063036f726401010a746578742f706c61696e004c827b2270223a22746170222c226f70223a22646d742d6d696e74222c22646570223a22346439363761663336646361636437653631393963333962646138353564376231623337323638663463383033316665643534303361393961633537666536376930222c227469636b223a226e6174222c22626c6b223a22383333313031227d68',
          'c088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff1',
        ],
        sequence: 4261412863,
      },
    ],
    vout: [
      {
        value: 0.00000294,
        n: 0,
        scriptPubKey: {
          asm: '0 cdc1cde2e417b586bd714f64afc3d7def41b6b15',
          desc: 'addr(bc1qehqumchyz76cd0t3faj2ls7hmm6pk6c45h4l9c)#uszxqzsr',
          hex: '0014cdc1cde2e417b586bd714f64afc3d7def41b6b15',
          address: 'bc1qehqumchyz76cd0t3faj2ls7hmm6pk6c45h4l9c',
          type: 'witness_v0_keyhash',
        },
      },
      {
        value: 0.17556669,
        n: 1,
        scriptPubKey: {
          asm: '1 45d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b',
          desc: 'rawtr(45d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b)#udku0ndg',
          hex: '512045d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b',
          address:
            'bc1pght6t3z93cde3xspersa6kg8l6aw5m6m77r3hd209mm2n0cus59shj4fnq',
          type: 'witness_v1_taproot',
        },
      },
    ],
    hex: '0200000000010170246f92140c93bab5428adf905aa9588d4e9ba72c854563e09a58df34fddac50100000000fffffffd022601000000000000160014cdc1cde2e417b586bd714f64afc3d7def41b6b15bde40b010000000022512045d7a5c4458e1b989a01c8e1dd5907febaea6f5bf7871bb54f2ef6a9bf1c850b0340f74eff55af88f049c5b4b67d29a5eeb0b9d3558656fe1412e108968f126971a29e056607c1108ead207f56351676789cb1d49daa16326ee0e7fc268775fa20c7bb2088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff1ac0063036f726401010a746578742f706c61696e004c827b2270223a22746170222c226f70223a22646d742d6d696e74222c22646570223a22346439363761663336646361636437653631393963333962646138353564376231623337323638663463383033316665643534303361393961633537666536376930222c227469636b223a226e6174222c22626c6b223a22383333313031227d6821c088225c0158a85208c9f0a93d3b724953f164a056121b81a87f88ab0a666cbff100000000',
    blockhash:
      '00000000000000000002d045520eb8425f4d4fab03acd36bc6c75796d8f6cebd',
    confirmations: 78520,
    time: 1709554372,
    blocktime: 1709554372,
  },
  error: null,
  id: requestId,
};

export const rawTransactionError = {
  response: {
    data: {
      result: null,
      error: {
        code: -5,
        message:
          'No such mempool or blockchain transaction. Use gettransaction for wallet transactions.',
      },
      id: txId,
    },
  },
};

export const address =
  'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk';
export const unisatAddressBalanceReponse = {
  code: 0,
  msg: 'ok',
  data: {
    address: 'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
    satoshi: 81425,
    pendingSatoshi: 0,
    utxoCount: 16,
    btcSatoshi: 52753,
    btcPendingSatoshi: 0,
    btcUtxoCount: 15,
    inscriptionSatoshi: 28672,
    inscriptionPendingSatoshi: 0,
    inscriptionUtxoCount: 1,
  },
};
export const unisatAddressEmptyBalanceReponse = {
  code: 0,
  msg: 'ok',
  data: {
    address: 'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
    satoshi: 0,
    pendingSatoshi: 0,
    utxoCount: 0,
    btcSatoshi: 0,
    btcPendingSatoshi: 0,
    btcUtxoCount: 0,
    inscriptionSatoshi: 0,
    inscriptionPendingSatoshi: 0,
    inscriptionUtxoCount: 0,
  },
};

export const unisatAddressRunesBalanceReponse = {
  code: 0,
  data: {
    detail: [
      {
        rune: 'ROSENNSTRUNE',
        runeid: '899493:443',
        spacedRune: 'ROSEN•NST•RUNE',
        amount: '2000000',
        symbol: '$',
        divisibility: 3,
      },
      {
        rune: 'ROSENPOCRUNE',
        runeid: '880887:3052',
        spacedRune: 'ROSEN•POC•RUNE',
        amount: '1000000000',
        symbol: '$',
        divisibility: 3,
      },
      {
        rune: 'TESTINGCATAETCH',
        runeid: '880352:855',
        spacedRune: 'TESTING•CATA•ETCH',
        amount: '4500000000',
        symbol: 'H',
        divisibility: 2,
      },
    ],
    height: 911623,
    start: 0,
    total: 3,
  },
};
export const unisatAddressEmptyRunesBalanceReponse = {
  code: 0,
  data: {
    detail: [],
    height: 911623,
    start: 0,
    total: 0,
  },
};

export const addressBalance: AssetBalance = {
  nativeToken: 81425n,
  tokens: [
    {
      id: '899493:443',
      value: 2000000n,
    },
    {
      id: '880887:3052',
      value: 1000000000n,
    },
    {
      id: '880352:855',
      value: 4500000000n,
    },
  ],
};

export const blockHash =
  '0000000000000000000007f86cc74fc4a3b7919a8268c93b852e36004cc317cb';
export const blockResponse = {
  result: {
    hash: '0000000000000000000007f86cc74fc4a3b7919a8268c93b852e36004cc317cb',
    confirmations: 10,
    height: 911620,
    version: 734568448,
    versionHex: '2bc8a000',
    merkleroot:
      'e526323a7eb9db8dd2960bae2aca1d8cb0b42673baa14993670bc69b7e4f05ef',
    time: 1756116580,
    mediantime: 1756115274,
    nonce: 2090000454,
    bits: '17022b91',
    target: '000000000000000000022b910000000000000000000000000000000000000000',
    difficulty: 129699156960680.9,
    chainwork:
      '0000000000000000000000000000000000000000dcff1080ea008a96be600ad6',
    nTx: 4,
    previousblockhash:
      '00000000000000000001f3c3c291a95a70e47dcb89ce88d5b9f8b2a3bdac5d66',
    nextblockhash:
      '000000000000000000009f8d10030950732e732ffa3779fb6b0d87fc0a4535d0',
    strippedsize: 14973,
    size: 25734,
    weight: 70653,
    tx: [
      '5b44774164a65ede31ef5b356be46254ef34e06465af9336f6e78fbc9d5ae388',
      'c6fd20a1086012a1a7ccb00c21b116ad52abda534ddffcfa0344081104ccf580',
      '60bb77f7737dd0c7ad5395ec286f1cc8fbd423eb4e76676b1e65992c157f553c',
      '28d1e2bf413dbcc4ec24b29b0cd095aa31523162552a48785f7457a91b142efc',
    ],
  },
  error: null,
  id: requestId,
};
export const blockTxIds = [
  '5b44774164a65ede31ef5b356be46254ef34e06465af9336f6e78fbc9d5ae388',
  'c6fd20a1086012a1a7ccb00c21b116ad52abda534ddffcfa0344081104ccf580',
  '60bb77f7737dd0c7ad5395ec286f1cc8fbd423eb4e76676b1e65992c157f553c',
  '28d1e2bf413dbcc4ec24b29b0cd095aa31523162552a48785f7457a91b142efc',
];
export const blockInfo = {
  hash: '0000000000000000000007f86cc74fc4a3b7919a8268c93b852e36004cc317cb',
  parentHash:
    '00000000000000000001f3c3c291a95a70e47dcb89ce88d5b9f8b2a3bdac5d66',
  height: 911620,
};

export const lockTxId =
  'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2';
export const lockTxBlockHash =
  '00000000000000000000a34330cefa5f08c714713b84a0595969c7e6b1326123';
export const lockTxRawTransactionResponse = {
  result: {
    txid: 'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2',
    hash: '862e6caff865b1dd174b05f761df3270623354c458a8a5c462f202a7bcbd1ec0',
    version: 2,
    size: 353,
    vsize: 302,
    weight: 1208,
    locktime: 0,
    vin: [
      {
        txid: '32a02f0d2612225bd41e82d60f80844ae006d10a836e80cef7a83d9ebb9fa92a',
        vout: 0,
        scriptSig: {
          asm: '',
          hex: '',
        },
        txinwitness: [
          'b435ab4a123da05904df5a6e60678ff0bda2f6353b4cf3392dcdda62dad22ce07ccce654c5360b738b4cba08b346ae89eec63bf865aeb285266c0064c36b44d9',
        ],
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        value: 0.000005,
        n: 0,
        scriptPubKey: {
          asm: '1 33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          desc: 'rawtr(33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7)#vuha8ehl',
          hex: '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          type: 'witness_v1_taproot',
        },
      },
      {
        value: 0.00003793,
        n: 1,
        scriptPubKey: {
          asm: '1 6049cdebe640d23d7a8e11d8591aca96c0cd96626fc850ab1b65e7d75fef5b17',
          desc: 'rawtr(6049cdebe640d23d7a8e11d8591aca96c0cd96626fc850ab1b65e7d75fef5b17)#jmx8gkp3',
          hex: '51206049cdebe640d23d7a8e11d8591aca96c0cd96626fc850ab1b65e7d75fef5b17',
          address:
            'bc1pvpyum6lxgrfr675wz8v9jxk2jmqvm9nzdly9p2cmvhnawhl0tvtsz73adv',
          type: 'witness_v1_taproot',
        },
      },
      {
        value: 0,
        n: 2,
        scriptPubKey: {
          asm: 'OP_RETURN 13 160100f7e135ec1790a10f00',
          desc: 'raw(6a5d0c160100f7e135ec1790a10f00)#5sxnelmj',
          hex: '6a5d0c160100f7e135ec1790a10f00',
          type: 'nulldata',
        },
      },
      {
        value: 0.00000294,
        n: 3,
        scriptPubKey: {
          asm: '0 010000000000001388000000000000089839011b',
          desc: 'addr(bc1qqyqqqqqqqqqp8zqqqqqqqqqqpzvrjqgmvkrl7x)#58dvwa5n',
          hex: '0014010000000000001388000000000000089839011b',
          address: 'bc1qqyqqqqqqqqqp8zqqqqqqqqqqpzvrjqgmvkrl7x',
          type: 'witness_v0_keyhash',
        },
      },
      {
        value: 0.00000295,
        n: 4,
        scriptPubKey: {
          asm: '0 2eff6f19da9c786a5be52986e4fa888754f48fdc',
          desc: 'addr(bc1q9mlk7xw6n3ux5kl99xrwf75gsa20fr7udfwt4u)#2de643sk',
          hex: '00142eff6f19da9c786a5be52986e4fa888754f48fdc',
          address: 'bc1q9mlk7xw6n3ux5kl99xrwf75gsa20fr7udfwt4u',
          type: 'witness_v0_keyhash',
        },
      },
      {
        value: 0.00000296,
        n: 5,
        scriptPubKey: {
          asm: '0 82639073e4b9827cba6224d854f00de94428ff00',
          desc: 'addr(bc1qsf3equlyhxp8ewnzynv9fuqda9zz3lcq0lv6t8)#v9hn4v6r',
          hex: '001482639073e4b9827cba6224d854f00de94428ff00',
          address: 'bc1qsf3equlyhxp8ewnzynv9fuqda9zz3lcq0lv6t8',
          type: 'witness_v0_keyhash',
        },
      },
      {
        value: 0.00000297,
        n: 6,
        scriptPubKey: {
          asm: '0 24e297ad5ab773a19ed6fac80c40de0000000000',
          desc: 'addr(bc1qyn3f0t26kae6r8kkltyqcsx7qqqqqqqq5r2dp2)#43pcwex3',
          hex: '001424e297ad5ab773a19ed6fac80c40de0000000000',
          address: 'bc1qyn3f0t26kae6r8kkltyqcsx7qqqqqqqq5r2dp2',
          type: 'witness_v0_keyhash',
        },
      },
    ],
    hex: '020000000001012aa99fbb9e3da8f7ce806e830ad106e04a84800fd6821ed45b2212260d2fa0320000000000ffffffff07f40100000000000022512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7d10e0000000000002251206049cdebe640d23d7a8e11d8591aca96c0cd96626fc850ab1b65e7d75fef5b1700000000000000000f6a5d0c160100f7e135ec1790a10f002601000000000000160014010000000000001388000000000000089839011b27010000000000001600142eff6f19da9c786a5be52986e4fa888754f48fdc280100000000000016001482639073e4b9827cba6224d854f00de94428ff00290100000000000016001424e297ad5ab773a19ed6fac80c40de00000000000140b435ab4a123da05904df5a6e60678ff0bda2f6353b4cf3392dcdda62dad22ce07ccce654c5360b738b4cba08b346ae89eec63bf865aeb285266c0064c36b44d900000000',
    blockhash:
      '00000000000000000000a34330cefa5f08c714713b84a0595969c7e6b1326123',
    confirmations: 27048,
    time: 1740061000,
    blocktime: 1740061000,
  },
  error: null,
  id: requestId,
};
export const lockTxRunesEventResponse = {
  code: 0,
  data: {
    detail: [
      {
        type: 'receive',
        address:
          'bc1pvpyum6lxgrfr675wz8v9jxk2jmqvm9nzdly9p2cmvhnawhl0tvtsz73adv',
        amount: '750000',
        height: 884583,
        txidx: 2875,
        txid: 'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2',
        timestamp: 1740061000,
        runeId: '880887:3052',
        rune: 'ROSENPOCRUNE',
        spacedRune: 'ROSEN•POC•RUNE',
        divisibility: 3,
        vout: 1,
        spentTxid: '',
        spentVout: 0,
      },
      {
        type: 'receive',
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        amount: '250000',
        height: 884583,
        txidx: 2875,
        txid: 'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2',
        timestamp: 1740061000,
        runeId: '880887:3052',
        rune: 'ROSENPOCRUNE',
        spacedRune: 'ROSEN•POC•RUNE',
        divisibility: 3,
        vout: 0,
        spentTxid: '',
        spentVout: 0,
      },
      {
        type: 'send',
        address:
          'bc1pvpyum6lxgrfr675wz8v9jxk2jmqvm9nzdly9p2cmvhnawhl0tvtsz73adv',
        amount: '1000000',
        height: 884583,
        txidx: 2875,
        txid: 'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2',
        timestamp: 1740061000,
        runeId: '880887:3052',
        rune: 'ROSENPOCRUNE',
        spacedRune: 'ROSEN•POC•RUNE',
        divisibility: 3,
        vout: 0,
        spentTxid:
          '32a02f0d2612225bd41e82d60f80844ae006d10a836e80cef7a83d9ebb9fa92a',
        spentVout: 0,
      },
    ],
    height: 911630,
    start: 0,
    total: 3,
  },
};
export const lockTx: BitcoinRunesTx = {
  id: 'ac16759cc66ad1f4b9fe49e068d979728302ed6fb566d94665c76a654a93eeb2',
  inputs: [
    {
      txId: '32a02f0d2612225bd41e82d60f80844ae006d10a836e80cef7a83d9ebb9fa92a',
      index: 0,
      scriptPubKey: '',
    },
  ],
  outputs: [
    {
      value: 500n,
      scriptPubKey:
        '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
      runes: [
        {
          runeId: '880887:3052',
          quantity: 250000n,
        },
      ],
    },
    {
      value: 3793n,
      scriptPubKey:
        '51206049cdebe640d23d7a8e11d8591aca96c0cd96626fc850ab1b65e7d75fef5b17',
      runes: [
        {
          runeId: '880887:3052',
          quantity: 750000n,
        },
      ],
    },
    {
      value: 0n,
      scriptPubKey: '6a5d0c160100f7e135ec1790a10f00',
      runes: [],
    },
    {
      value: 294n,
      scriptPubKey: '0014010000000000001388000000000000089839011b',
      runes: [],
    },
    {
      value: 295n,
      scriptPubKey: '00142eff6f19da9c786a5be52986e4fa888754f48fdc',
      runes: [],
    },
    {
      value: 296n,
      scriptPubKey: '001482639073e4b9827cba6224d854f00de94428ff00',
      runes: [],
    },
    {
      value: 297n,
      scriptPubKey: '001424e297ad5ab773a19ed6fac80c40de0000000000',
      runes: [],
    },
  ],
};

export const runeId = '880887:3052';
export const unisatRunesInfoResponse = {
  code: 0,
  data: {
    runeid: '880887:3052',
    rune: 'ROSENPOCRUNE',
    spacedRune: 'ROSEN•POC•RUNE',
    number: 169515,
    height: 880887,
    txidx: 3052,
    timestamp: 1737887492,
    divisibility: 3,
    symbol: '$',
    etching: '982db056c0434f0544e05770e0c031b1f241992e0b844df6623d510f21ffdd7b',
    premine: '1000000000',
    terms: null,
    mints: '0',
    burned: '0',
    holders: 1,
    transactions: 14,
    supply: '1000000000',
    start: null,
    end: null,
    mintable: false,
    remaining: '0',
    anHourMints: 0,
    sixHourMints: 0,
    oneDayMints: 0,
    sevenDayMints: 0,
    progress: 1,
  },
};
export const expectedTokenDetail = {
  tokenId: runeId,
  name: 'ROSEN•POC•RUNE',
  decimals: 3,
};

export const unisatNullResponse = {
  code: 0,
  data: null,
};

export const txOutResponse = {
  result: {
    bestblock:
      '0000000000000000000042eb995658250686ad21277ca64e2fdbbc87aaae0515',
    confirmations: 6892,
    value: 0.0000033,
    scriptPubKey: {
      asm: '1 33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
      desc: 'rawtr(33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7)#vuha8ehl',
      hex: '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
      address: 'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
      type: 'witness_v1_taproot',
    },
    coinbase: false,
  },
  error: null,
  id: requestId,
};
export const spentTxOutResponse = {
  result: null,
  error: null,
  id: requestId,
};

export const utxoId =
  'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4.1';
export const runeUtxoRawTransactionResponse = {
  result: {
    txid: 'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4',
    hash: '3dcaacc6b046798fa41fa44cc5682f970c1093f825c982b566fff73765dc2ad0',
    version: 2,
    size: 276,
    vsize: 225,
    weight: 900,
    locktime: 0,
    vin: [
      {
        txid: '7a7ca7dc46c631943bf8ef28dc200fda242fa9019316ffa2e8ce9c1b40261738',
        vout: 1,
        scriptSig: {
          asm: '',
          hex: '',
        },
        txinwitness: [
          'd493b590329b06b60611834cd795f0468a1271b7394e4ccbaf5a2d14467438d82df3c4ebe28f136f7fec0f646aed8ff793ec7ad556f89a4626c7dac8575f9fb1',
        ],
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        value: 0.0000033,
        n: 0,
        scriptPubKey: {
          asm: '1 33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          desc: 'rawtr(33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7)#vuha8ehl',
          hex: '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          type: 'witness_v1_taproot',
        },
      },
      {
        value: 0.0000033,
        n: 1,
        scriptPubKey: {
          asm: '1 33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          desc: 'rawtr(33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7)#vuha8ehl',
          hex: '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          type: 'witness_v1_taproot',
        },
      },
      {
        value: 0.0000262,
        n: 2,
        scriptPubKey: {
          asm: '1 33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          desc: 'rawtr(33fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7)#vuha8ehl',
          hex: '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          type: 'witness_v1_taproot',
        },
      },
      {
        value: 0,
        n: 3,
        scriptPubKey: {
          asm: 'OP_RETURN 13 160100f7e135ec17d836000000d83601',
          desc: 'raw(6a5d10160100f7e135ec17d836000000d83601)#tzkwjlst',
          hex: '6a5d10160100f7e135ec17d836000000d83601',
          type: 'nulldata',
        },
      },
    ],
    hex: '02000000000101381726401b9ccee8a2ff169301a92f24da0f20dc28eff83b9431c646dca77c7a0100000000ffffffff044a0100000000000022512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb74a0100000000000022512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb73c0a00000000000022512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb70000000000000000136a5d10160100f7e135ec17d836000000d836010140d493b590329b06b60611834cd795f0468a1271b7394e4ccbaf5a2d14467438d82df3c4ebe28f136f7fec0f646aed8ff793ec7ad556f89a4626c7dac8575f9fb100000000',
    blockhash:
      '00000000000000000001ffdb078f059d7549a58191e6f25e1a0f09ab78d71781',
    confirmations: 6892,
    time: 1752061324,
    blocktime: 1752061324,
  },
  error: null,
  id: requestId,
};
export const unisatUtxoRunesBalance = {
  code: 0,
  data: [
    {
      rune: 'TESTINGCATAETCH',
      runeid: '880352:855',
      spacedRune: 'TESTING•CATA•ETCH',
      amount: '4492999000',
      symbol: 'H',
      divisibility: 2,
    },
    {
      rune: 'ROSENPOCRUNE',
      runeid: '880887:3052',
      spacedRune: 'ROSEN•POC•RUNE',
      amount: '3998',
      symbol: '$',
      divisibility: 3,
    },
  ],
};
export const runesUtxo: BitcoinRunesUtxo = {
  txId: 'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4',
  index: 1,
  value: 330n,
  runes: [
    {
      runeId: '880352:855',
      quantity: 4492999000n,
    },
    {
      runeId: '880887:3052',
      quantity: 3998n,
    },
  ],
};

export const feeRatioResponse = {
  result: {
    feerate: 0.00001,
    blocks: 6,
  },
  error: null,
  id: requestId,
};
export const feeRatio = 1;

export const mempoolEntryResponse = {
  result: {
    vsize: 314,
    weight: 1253,
    time: 1756131591,
    height: 911642,
    descendantcount: 1,
    descendantsize: 314,
    ancestorcount: 1,
    ancestorsize: 314,
    wtxid: '54964cef5bb896e27319b42b65a12e8dd103eef60cbab3101893735773dbfc69',
    fees: {
      base: 0.00000927,
      modified: 0.00000927,
      ancestor: 0.00000927,
      descendant: 0.00000927,
    },
    depends: [],
    spentby: [],
    'bip125-replaceable': true,
    unbroadcast: false,
  },
  error: null,
  id: requestId,
};
export const mempoolEntryError = {
  response: {
    data: {
      result: null,
      error: { code: -5, message: 'Transaction not in mempool' },
      id: requestId,
    },
  },
};

export const unisatAddressRunesUtxos = {
  code: 0,
  data: {
    height: 911642,
    start: 0,
    total: 13,
    utxo: [
      {
        height: 904786,
        confirmations: 6857,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        satoshi: 330,
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        txid: '4a6621ebf7c537b8185b72739fce63d8d9c6d6af7ff18341139fdaddaeaa7015',
        vout: 0,
        runes: [
          {
            rune: 'ROSENPOCRUNE',
            runeid: '880887:3052',
            spacedRune: 'ROSEN•POC•RUNE',
            amount: '1',
            symbol: '$',
            divisibility: 3,
          },
        ],
      },
      {
        height: 904747,
        confirmations: 6896,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        satoshi: 330,
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        txid: 'db36ab62179dc6291344d2bdc698f7f778a04702a13216e4f66ad52b62ba6426',
        vout: 0,
        runes: [
          {
            rune: 'ROSENPOCRUNE',
            runeid: '880887:3052',
            spacedRune: 'ROSEN•POC•RUNE',
            amount: '1',
            symbol: '$',
            divisibility: 3,
          },
        ],
      },
      {
        height: 904746,
        confirmations: 6897,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        satoshi: 330,
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        txid: 'e0e441e42a33126398d2d044599ec9dfcfd86a1e40d1c2836fadb4b53bb5cf29',
        vout: 0,
        runes: [
          {
            rune: 'ROSENPOCRUNE',
            runeid: '880887:3052',
            spacedRune: 'ROSEN•POC•RUNE',
            amount: '15',
            symbol: '$',
            divisibility: 3,
          },
        ],
      },
      {
        height: 904717,
        confirmations: 6926,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        satoshi: 330,
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        txid: '7a7ca7dc46c631943bf8ef28dc200fda242fa9019316ffa2e8ce9c1b40261738',
        vout: 0,
        runes: [
          {
            rune: 'ROSENPOCRUNE',
            runeid: '880887:3052',
            spacedRune: 'ROSEN•POC•RUNE',
            amount: '2',
            symbol: '$',
            divisibility: 3,
          },
        ],
      },
      {
        height: 904888,
        confirmations: 6755,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        satoshi: 330,
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        txid: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
        vout: 0,
        runes: [
          {
            rune: 'ROSENPOCRUNE',
            runeid: '880887:3052',
            spacedRune: 'ROSEN•POC•RUNE',
            amount: '17',
            symbol: '$',
            divisibility: 3,
          },
        ],
      },
    ],
  },
};
export const unisatAddressRunesWithoutUtxos = {
  code: 0,
  data: {
    height: 911642,
    start: 0,
    total: 13,
    utxo: [],
  },
};
export const addressRunesUtxos: BitcoinRunesUtxo[] = [
  {
    txId: '4a6621ebf7c537b8185b72739fce63d8d9c6d6af7ff18341139fdaddaeaa7015',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 1n,
      },
    ],
  },
  {
    txId: 'db36ab62179dc6291344d2bdc698f7f778a04702a13216e4f66ad52b62ba6426',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 1n,
      },
    ],
  },
  {
    txId: 'e0e441e42a33126398d2d044599ec9dfcfd86a1e40d1c2836fadb4b53bb5cf29',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 15n,
      },
    ],
  },
  {
    txId: '7a7ca7dc46c631943bf8ef28dc200fda242fa9019316ffa2e8ce9c1b40261738',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 2n,
      },
    ],
  },
  {
    txId: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 17n,
      },
    ],
  },
];
export const unisatAddressRunesUtxos2 = [
  {
    code: 0,
    data: {
      height: 919219,
      start: 0,
      total: 4,
      utxo: [
        {
          height: 918905,
          confirmations: 315,
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          satoshi: 532,
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          txid: 'tx1',
          vout: 0,
          runes: [
            {
              rune: 'TESTINGCATAETCH',
              runeid: '880352:855',
              spacedRune: 'TESTING•CATA•ETCH',
              amount: '4492999000',
              symbol: 'H',
              divisibility: 2,
            },
            {
              rune: 'ROSENPOCRUNE',
              runeid: '880887:3052',
              spacedRune: 'ROSEN•POC•RUNE',
              amount: '148032',
              symbol: '$',
              divisibility: 3,
            },
          ],
        },
        {
          height: 904746,
          confirmations: 14474,
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          satoshi: 2682,
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          txid: 'tx2',
          vout: 1,
          runes: [
            {
              rune: 'ROSENPOCRUNE',
              runeid: '880887:3052',
              spacedRune: 'ROSEN•POC•RUNE',
              amount: '749985',
              symbol: '$',
              divisibility: 3,
            },
          ],
        },
      ],
    },
  },
  {
    code: 0,
    data: {
      height: 919219,
      start: 2,
      total: 4,
      utxo: [
        {
          height: 918905,
          confirmations: 315,
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          satoshi: 532,
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          txid: 'tx3',
          vout: 1,
          runes: [
            {
              rune: 'ROSENPOCRUNE',
              runeid: '880887:3052',
              spacedRune: 'ROSEN•POC•RUNE',
              amount: '800',
              symbol: '$',
              divisibility: 3,
            },
          ],
        },
        {
          height: 904746,
          confirmations: 14474,
          address:
            'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
          satoshi: 2682,
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          txid: 'tx4',
          vout: 1,
          runes: [
            {
              rune: 'ROSENPOCRUNE',
              runeid: '880887:3052',
              spacedRune: 'ROSEN•POC•RUNE',
              amount: '1000',
              symbol: '$',
              divisibility: 3,
            },
          ],
        },
      ],
    },
  },
  {
    code: 0,
    data: {
      height: 919219,
      start: 4,
      total: 4,
      utxo: [],
    },
  },
];

export const invalidAddress = 'bc1qlhlqd2lvdft9alekqndnplfsq6dj723gh49wrq';
export const addressRunesUtxosWithInvalidAddress = {
  code: 1001,
  msg: 'address invalid',
};

export const unisatAddressAvailableUtxoData = {
  code: 0,
  msg: 'ok',
  data: {
    cursor: 0,
    total: 1,
    utxo: [
      {
        confirmations: 29904,
        txid: '8ef378b5976a0f098b9ff6a793c80fa154a4ef48f44b22d92d2829b88dcbb19e',
        vout: 0,
        satoshi: 600,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 881740,
        idx: 1011,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
    ],
  },
};
export const unisatAddressAvailableUtxoData2 = [
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 0,
      total: 4,
      utxo: [
        {
          confirmations: 10,
          txid: 'tx1',
          vout: 0,
          satoshi: 55133,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915891,
          idx: 669,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 1,
          inscriptions: [],
        },
        {
          confirmations: 10,
          txid: 'tx2',
          vout: 0,
          satoshi: 55133,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915891,
          idx: 669,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 1,
          inscriptions: [],
        },
      ],
    },
  },
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 2,
      total: 4,
      utxo: [
        {
          confirmations: 10,
          txid: 'tx3',
          vout: 0,
          satoshi: 55133,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915891,
          idx: 669,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 1,
          inscriptions: [],
        },
        {
          confirmations: 10,
          txid: 'tx4',
          vout: 0,
          satoshi: 55133,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915891,
          idx: 669,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 1,
          inscriptions: [],
        },
      ],
    },
  },
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 4,
      total: 4,
      utxo: [],
    },
  },
];
export const btcUtxos: BitcoinRunesUtxo[] = [
  {
    txId: '8ef378b5976a0f098b9ff6a793c80fa154a4ef48f44b22d92d2829b88dcbb19e',
    index: 0,
    value: 600n,
    runes: [],
  },
];
export const unisatAddressEmptyAvailableUtxoData = {
  code: 0,
  msg: 'ok',
  data: {
    cursor: 0,
    total: 0,
    utxo: [],
  },
};
export const unisatInvalidAddressAvailableUtxoData = {
  code: -1,
  msg: 'address invalid',
  data: null,
};

export const alreadyFetchedUtxoId =
  'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4.0';
export const unisatAddressAllUtxoData = {
  code: 0,
  msg: 'ok',
  data: {
    cursor: 0,
    total: 16,
    totalConfirmed: 16,
    totalUnconfirmed: 0,
    totalUnconfirmedSpend: 0,
    utxo: [
      {
        txid: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
        vout: 1,
        satoshi: 42811,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 904888,
        idx: 1676,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
      {
        txid: 'ee4bc4d6ac8cdffda444b3679397bd35e3b906a3d6b4712ff1cf83e8917b13e9',
        vout: 0,
        satoshi: 330,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 905850,
        idx: 1509,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
      {
        txid: 'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4',
        vout: 1,
        satoshi: 330,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 904747,
        idx: 1416,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
      {
        txid: 'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4',
        vout: 0,
        satoshi: 330,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 904747,
        idx: 1416,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
      {
        txid: 'e053ffb44b34166348e295c00972d8540967db3ef5f21256de20352b18d94c89',
        vout: 0,
        satoshi: 330,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 899501,
        idx: 1773,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
      {
        txid: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
        vout: 0,
        satoshi: 330,
        scriptType: '5120',
        scriptPk:
          '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
        codeType: 9,
        address:
          'bc1px0ad45qrfwc20yfd9wljeytrvfa6tmrcxv6pgxze2svvx00tp7mstj5rpk',
        height: 904888,
        idx: 1676,
        isOpInRBF: false,
        isSpent: false,
        inscriptionsCount: 0,
        inscriptions: [],
      },
    ],
  },
};
export const unisatAddressAllUtxoData2 = [
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 0,
      total: 4,
      totalConfirmed: 4,
      totalUnconfirmed: 0,
      totalUnconfirmedSpend: 0,
      utxo: [
        {
          txid: '22b93e565aaa62ab0fa1471fcaabaa7e665a4d3d3623186bd36a241cbe65f850',
          vout: 0,
          satoshi: 55133,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915891,
          idx: 669,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 1,
          inscriptions: [],
        },
        {
          txid: 'e0e441e42a33126398d2d044599ec9dfcfd86a1e40d1c2836fadb4b53bb5cf29',
          vout: 1,
          satoshi: 500,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 904746,
          idx: 1071,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 0,
          inscriptions: [],
        },
      ],
    },
  },
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 2,
      total: 4,
      totalConfirmed: 4,
      totalUnconfirmed: 0,
      totalUnconfirmedSpend: 0,
      utxo: [
        {
          txid: 'ba9bd0e9c84b2743313d3b7f34777e9dab0688fc85fa9cce8cbb340f8d06ffcb',
          vout: 0,
          satoshi: 500,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 915580,
          idx: 1029,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 0,
          inscriptions: [],
        },
        {
          txid: '7d22bdccbe0bd61aa85b06249e34b4f3c68e7617717022dbb2d7ce0c49e589f0',
          vout: 1,
          satoshi: 546,
          scriptType: '5120',
          scriptPk:
            '512033fadad0034bb0a7912d2bbf2c9163627ba5ec7833341418595418c33deb0fb7',
          codeType: 9,
          address:
            'bc1pjxzw9tm6qatyapu3c409dg8k23p4hjlk4ehwwlsum3emjqsaetrqppyu2z',
          height: 913922,
          idx: 1206,
          isOpInRBF: false,
          isSpent: false,
          inscriptionsCount: 0,
          inscriptions: [],
        },
      ],
    },
  },
  {
    code: 0,
    msg: 'ok',
    data: {
      cursor: 4,
      total: 4,
      totalConfirmed: 4,
      totalUnconfirmed: 0,
      totalUnconfirmedSpend: 0,
      utxo: [],
    },
  },
];
export const unisatUtxoRunesBalanceForAllUtxos = [
  {
    code: 0,
    data: [
      {
        rune: 'ROSENPOCRUNE',
        runeid: '880887:3052',
        spacedRune: 'ROSEN•POC•RUNE',
        amount: '998969981',
        symbol: '$',
        divisibility: 3,
      },
    ],
  },
  {
    code: 0,
    data: [
      {
        rune: 'ROSENPOCRUNE',
        runeid: '880887:3052',
        spacedRune: 'ROSEN•POC•RUNE',
        amount: '3000',
        symbol: '$',
        divisibility: 3,
      },
    ],
  },
  {
    code: 0,
    data: [
      {
        rune: 'TESTINGCATAETCH',
        runeid: '880352:855',
        spacedRune: 'TESTING•CATA•ETCH',
        amount: '4492999000',
        symbol: 'H',
        divisibility: 2,
      },
      {
        rune: 'ROSENPOCRUNE',
        runeid: '880887:3052',
        spacedRune: 'ROSEN•POC•RUNE',
        amount: '3998',
        symbol: '$',
        divisibility: 3,
      },
    ],
  },
  {
    code: 0,
    data: [
      {
        rune: 'ROSENNSTRUNE',
        runeid: '899493:443',
        spacedRune: 'ROSEN•NST•RUNE',
        amount: '2000000',
        symbol: '$',
        divisibility: 3,
      },
    ],
  },
  {
    code: 0,
    data: [
      {
        rune: 'ROSENPOCRUNE',
        runeid: '880887:3052',
        spacedRune: 'ROSEN•POC•RUNE',
        amount: '17',
        symbol: '$',
        divisibility: 3,
      },
    ],
  },
];
export const remainingUtxos: BitcoinRunesUtxo[] = [
  {
    txId: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
    index: 1,
    value: 42811n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 998969981n,
      },
    ],
  },
  {
    txId: 'ee4bc4d6ac8cdffda444b3679397bd35e3b906a3d6b4712ff1cf83e8917b13e9',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 3000n,
      },
    ],
  },
  {
    txId: 'a1dfdef4f618a2aa8fbc06628ec624a583e39a4c6af2aecaf6bbe4699a6a24a4',
    index: 1,
    value: 330n,
    runes: [
      {
        runeId: '880352:855',
        quantity: 4492999000n,
      },
      {
        runeId: '880887:3052',
        quantity: 3998n,
      },
    ],
  },
  {
    txId: 'e053ffb44b34166348e295c00972d8540967db3ef5f21256de20352b18d94c89',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '899493:443',
        quantity: 2000000n,
      },
    ],
  },
  {
    txId: 'a317fd0fd2c3caf57065fe29bb50c31daa496fd6da1eb20464637fd871f29773',
    index: 0,
    value: 330n,
    runes: [
      {
        runeId: '880887:3052',
        quantity: 17n,
      },
    ],
  },
];
export const unisatAddressEmptyAllUtxoData = {
  code: 0,
  msg: 'ok',
  data: {
    cursor: 0,
    total: 0,
    totalConfirmed: 0,
    totalUnconfirmed: 0,
    totalUnconfirmedSpend: 0,
    utxo: [],
  },
};
export const unisatInvalidAddressAllUtxoData = {
  code: -1,
  msg: 'address invalid',
  data: null,
};
