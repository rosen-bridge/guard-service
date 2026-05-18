export const lockAddress = 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN';
export const lockAddressPublicKey =
  '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac';

// RPC response for blockchain info
export const blockHeightResponse = {
  result: {
    chain: 'main',
    blocks: 5693743,
    headers: 5693743,
    bestblockhash:
      '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a',
    difficulty: 53216508.58110767,
    mediantime: 1746280884,
    verificationprogress: 0.9999990831244884,
    initialblockdownload: false,
    chainwork:
      '000000000000000000000000000000000000000000001b0199aba077b02aadc8',
    size_on_disk: 189137123969,
    pruned: false,
    softforks: [
      {
        id: 'bip34',
        version: 2,
        reject: {
          status: true,
        },
      },
      {
        id: 'bip66',
        version: 3,
        reject: {
          status: true,
        },
      },
      {
        id: 'bip65',
        version: 4,
        reject: {
          status: true,
        },
      },
    ],
    bip9_softforks: {
      csv: {
        status: 'failed',
        startTime: 1462060800,
        timeout: 1493596800,
        since: 1703520,
      },
    },
    warnings: '',
  },
  error: null,
  id: 'getinfo_request',
};

// Block hash for testing
export const blockHash =
  '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a';

// RPC response for a block
export const blockResponse = {
  result: {
    hash: '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a',
    confirmations: 2,
    strippedsize: 18188,
    size: 18188,
    weight: 72752,
    height: 5693743,
    version: 6422788,
    versionHex: '00620104',
    merkleroot:
      '99b7688dd7d3cc9e0871031677d7e32c067d333927ec728986c0d0b7ef0c94ca',
    tx: [
      '7b110de3db716e12de71ca59216a84c985c2f5e5c50ae783d2677d9c0df60658',
      '6891a81de933788e1ca8f4735054a86ec4ddf5d768a9dc9057c8d707ea1a9a30',
      '35b8fd16ecc0553c81c980f5e8355d19dbfb1e3306aa3c7f0b8861178a46125a',
      '788dace4245c70eba4471addd16b545da1f8b36469e3e69580af330745add5e8',
      '27856d2df08f9e34e0b7676e6e51bbf43a448f5bdb816c7c1ebe51ca1bc06834',
      '6889495f54698c6306339fe3609f9e1d1cb78319f3345f91394f5f3ef6ad7804',
      'c63556a9dce4b2520d72fee915bcd3fc41783538768152933866bd867060fa0c',
      'caa9dd2e997e58444e04d4a362a86411905d6260c803e9348fa203596f330ef8',
      '08ba4e8df2244f339944f66a636fb3ec312ee7ae69041d0928f1ebcb95b47887',
      'c42166250fe4f161b2cd5168fe4c18592c5d8322553ae7a815e999e864753427',
    ],
    time: 1746281170,
    mediantime: 1746280884,
    nonce: 0,
    bits: '1950b4c9',
    difficulty: 53216508.58110767,
    chainwork:
      '000000000000000000000000000000000000000000001b0199aba077b02aadc8',
    previousblockhash:
      'cdb5f24555323bd352c17385ab8b9bf32362c19d8b141430acd2c01250892233',
    nextblockhash:
      '2620dc978e666924e772d88745bae437a5587f4292e3969fce76dc8aa618eeb8',
  },
  error: null,
  id: 'getblock_request',
};

// Block info object for testing
export const blockInfo = {
  hash: '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a',
  parentHash:
    'cdb5f24555323bd352c17385ab8b9bf32362c19d8b141430acd2c01250892233',
  height: 5693743,
};

// Transaction ID for testing
export const txId =
  '19774cdc6bc663926590dc2fe7bfe77ba57a5343aaa16db5ffc377e95663fd4e';

// Block hash for the transaction
export const txBlockHash =
  '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a';

// RPC response for a transaction
export const txResponse = {
  result: {
    hex: '0100000001334a2a5e41047070a5497cf208b3c408998bc4be3487b8125e244bbfb742d915000000006b483045022100dce96e89af41443891626f059ab6934a5b8ac76de3b6881cdc87a0c1c578cc070220054d44f9b6241fe9fbd10482ae5f285c273025324538a3d7e419d7f3dde69d0d012103dc1945a85a6147ed5da6d6f150e9de002e40c4ff48cca96b488fe74fa9af8a88ffffffff02109e6cd81b0000001976a9144883eb0a391995f422a48595edf7a19af5e0660c88ac3b70f1bd731b00001976a914a17fdccb11e75bf95df8f760fde346357f34c7ec88ac00000000',
    txid: '87ce994dacf48d97dcffd30221f70acf8c2b40ba4d5ed9be8615d79daf922c73',
    hash: '87ce994dacf48d97dcffd30221f70acf8c2b40ba4d5ed9be8615d79daf922c73',
    size: 226,
    vsize: 226,
    version: 1,
    locktime: 0,
    vin: [
      {
        txid: '15d942b7bf4b245e12b88734bec48b9908c4b308f27c49a5707004415e2a4a33',
        vout: 0,
        scriptSig: {
          asm: '3045022100dce96e89af41443891626f059ab6934a5b8ac76de3b6881cdc87a0c1c578cc070220054d44f9b6241fe9fbd10482ae5f285c273025324538a3d7e419d7f3dde69d0d[ALL] 03dc1945a85a6147ed5da6d6f150e9de002e40c4ff48cca96b488fe74fa9af8a88',
          hex: '483045022100dce96e89af41443891626f059ab6934a5b8ac76de3b6881cdc87a0c1c578cc070220054d44f9b6241fe9fbd10482ae5f285c273025324538a3d7e419d7f3dde69d0d012103dc1945a85a6147ed5da6d6f150e9de002e40c4ff48cca96b488fe74fa9af8a88',
        },
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        value: 1195.95114,
        n: 0,
        scriptPubKey: {
          asm: 'OP_DUP OP_HASH160 4883eb0a391995f422a48595edf7a19af5e0660c OP_EQUALVERIFY OP_CHECKSIG',
          hex: '76a9144883eb0a391995f422a48595edf7a19af5e0660c88ac',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['DBkXDuHLVa7a6jwaYm1qnsHqQbyaPcHFXk'],
        },
      },
      {
        value: 301839.21905723,
        n: 1,
        scriptPubKey: {
          asm: 'OP_DUP OP_HASH160 a17fdccb11e75bf95df8f760fde346357f34c7ec OP_EQUALVERIFY OP_CHECKSIG',
          hex: '76a914a17fdccb11e75bf95df8f760fde346357f34c7ec88ac',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['DKs2WBbiaAEe9RGzQTmtJj1o9bqsKTUTtC'],
        },
      },
    ],
    blockhash:
      'e9fd23982c29992396081fd391389f7648a14bd0ecd6efee22156c856743fbee',
    confirmations: 4351,
    time: 1746084906,
    blocktime: 1746084906,
  },
  error: null,
  id: '19774cdc6bc663926590dc2fe7bfe77ba57a5343aaa16db5ffc377e95663fd4e',
};
// Response for transaction not in mempool
export const txNotInMempoolResponse = {
  result: null,
  error: {
    code: -5,
    message: 'Transaction not in mempool',
  },
  id: 'mempool_request',
};

// UTXO response for testing
export const txOutResponse = {
  result: {
    bestblock:
      '7ece87585c3bda22c8357efaabfe1b4264ccb23360dee49a779a41c9865c5fb1',
    confirmations: 4,
    value: 10025.96814264,
    scriptPubKey: {
      asm: 'OP_DUP OP_HASH160 212da786d4574d8401d73ac295f34a9ebd98386b OP_EQUALVERIFY OP_CHECKSIG',
      hex: '76a914212da786d4574d8401d73ac295f34a9ebd98386b88ac',
      reqSigs: 1,
      type: 'pubkeyhash',
      addresses: ['D8AXXiGEZeZnMKTKnC9AWB3YUU4jfMAmYU'],
    },
    version: 1,
    coinbase: true,
  },
  error: null,
  id: 'gettxout_request',
};

// Fee estimation response
export const estimateSmartFeeResponse = {
  result: {
    feerate: 0.01001657,
    blocks: 10,
  },
  error: null,
  id: 'fee_request',
};

// Transaction hex response
export const txHexResponse = {
  result:
    '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff35032fe1560fe4b883e5bda9e7a59ee4bb99e9b1bc205b323032352d30352d30335431343a30363a31302e3532393530363039345a5dffffffff01b84d6d6fe90000001976a914212da786d4574d8401d73ac295f34a9ebd98386b88ac00000000',
  error: null,
  id: 'gettxhex_request',
};

// Firo transaction object
export const firoTx = {
  id: '87ce994dacf48d97dcffd30221f70acf8c2b40ba4d5ed9be8615d79daf922c73',
  inputs: [
    {
      txId: '15d942b7bf4b245e12b88734bec48b9908c4b308f27c49a5707004415e2a4a33',
      index: 0,
      scriptPubKey:
        '483045022100dce96e89af41443891626f059ab6934a5b8ac76de3b6881cdc87a0c1c578cc070220054d44f9b6241fe9fbd10482ae5f285c273025324538a3d7e419d7f3dde69d0d012103dc1945a85a6147ed5da6d6f150e9de002e40c4ff48cca96b488fe74fa9af8a88',
    },
  ],
  outputs: [
    {
      value: 119595114000n, // Value in satoshis (1195.95114000 FIRO)
      scriptPubKey: '76a9144883eb0a391995f422a48595edf7a19af5e0660c88ac',
    },
    {
      value: 30183921905723n, // Value in satoshis (301839.21905723 FIRO)
      scriptPubKey: '76a914a17fdccb11e75bf95df8f760fde346357f34c7ec88ac',
    },
  ],
};

// UTXO object
export const firoUtxo = {
  txId: '19774cdc6bc663926590dc2fe7bfe77ba57a5343aaa16db5ffc377e95663fd4e',
  index: 0,
  value: 119595114000n, // Value in satoshis (1195.95114 FIRO)
};

// Include these for compatibility with existing tests
export const firoPaymentBytes =
  '70736274ff0100b30200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee297850200000000ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100fd1d010200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee29785020000006a47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac0000000000000000';

export const unsignedTxId = 'unsigned_tx_id_placeholder';

// Mock UTXOs for getAddressBoxes test
export const mockAddressUtxos = [
  {
    txid: txId,
    outputIndex: 0,
    address: lockAddress,
    script: lockAddressPublicKey,
    satoshis: 1050000000,
    height: 5693743,
  },
  {
    txid: '2nd-tx-id',
    outputIndex: 1,
    address: lockAddress,
    script: lockAddressPublicKey,
    satoshis: 525000000,
    height: 5693740,
  },
  {
    txid: '3rd-tx-id',
    outputIndex: 0,
    address: lockAddress,
    script: lockAddressPublicKey,
    satoshis: 200000000,
    height: 5693738,
  },
];

// Expected output for getAddressBoxes test (first 2 UTXOs)
export const expectedAddressBoxes = [
  {
    txId: txId,
    index: 0,
    value: 1050000000n, // 10.5 FIRO in satoshis
  },
  {
    txId: '2nd-tx-id',
    index: 1,
    value: 525000000n, // 5.25 FIRO in satoshis
  },
];

// getspentinfo response for a spent UTXO
export const spentInfoResponse = {
  result: {
    txid: '87ce994dacf48d97dcffd30221f70acf8c2b40ba4d5ed9be8615d79daf922c73',
    index: 0,
    height: 5693740,
  },
  error: null,
  id: 'getspentinfo_request',
};

// getspentinfo response for an unspent UTXO (RPC returns error)
export const unspentInfoError = {
  response: {
    data: {
      result: null,
      error: {
        code: -5,
        message: 'Unable to get spent info',
      },
      id: 'getspentinfo_request',
    },
  },
};

// Expected confirmation count (should match txResponse.result.confirmations)
export const expectedTxConfirmation = 4351;

// Total balance for address assets (sum of all mock UTXOs)
export const expectedAddressBalance = 1775000000n; // 17.75 FIRO in satoshis
