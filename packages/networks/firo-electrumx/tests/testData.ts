export const lockAddress = 'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN';
export const lockAddressPublicKey =
  '76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac';

// 80-byte block header hex (valid, produces deterministic hash)
export const blockHeaderHex =
  '010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080924a66ffff001d00000000';

// Block hash computed from header (double-SHA256, reversed)
export const blockHash =
  'ea7f792f3d80c362770b598bb1756e52fbf451a50b8e59f7b0398063e3134220';

// ElectrumX blockchain.headers.subscribe response
export const blockHeightResponse = {
  hex: blockHeaderHex,
  height: 42,
};

// Block info object
export const blockInfo = {
  hash: blockHash,
  parentHash:
    '0000000000000000000000000000000000000000000000000000000000000000',
  height: 42,
};

export const blockInfoWithoutHeight = {
  hash: blockInfo.hash,
  parentHash: blockInfo.parentHash,
};

// Transaction IDs
export const txId =
  '87ce994dacf48d97dcffd30221f70acf8c2b40ba4d5ed9be8615d79daf922c73';
export const txBlockHash =
  '491256bdad2121de4a07e640795398f92da33e6082bab6c2c859f2be2a48ad1a';
export const unsignedTxId = 'unsigned_tx_id_placeholder';

// Raw transaction hex (version 1, 1 input, 2 outputs)
export const txHex =
  '0100000001334a2a5e41047070a5497cf208b3c408998bc4be3487b8125e244bbfb742d915000000006b483045022100dce96e89af41443891626f059ab6934a5b8ac76de3b6881cdc87a0c1c578cc070220054d44f9b6241fe9fbd10482ae5f285c273025324538a3d7e419d7f3dde69d0d012103dc1945a85a6147ed5da6d6f150e9de002e40c4ff48cca96b488fe74fa9af8a88ffffffff02109e6cd81b0000001976a9144883eb0a391995f422a48595edf7a19af5e0660c88ac3b70f1bd731b00001976a914a17fdccb11e75bf95df8f760fde346357f34c7ec88ac00000000';

// Same transaction shape with version 3 and type 8 packed into the 4-byte field.
export const txHexV3Typed = `03000800${txHex.slice(8)}00`;

// Parsed FiroTx
export const firoTx = {
  id: txId,
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
      value: 119595114000n,
      scriptPubKey: '76a9144883eb0a391995f422a48595edf7a19af5e0660c88ac',
    },
    {
      value: 30183921905723n,
      scriptPubKey: '76a914a17fdccb11e75bf95df8f760fde346357f34c7ec88ac',
    },
  ],
};

export const firoTxWithoutId = {
  inputs: firoTx.inputs,
  outputs: firoTx.outputs,
};

// UTXO
export const firoUtxo = {
  txId: txId,
  index: 0,
  value: 119595114000n,
};

// Firo payment transaction bytes
export const firoPaymentBytes =
  '70736274ff0100b30200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee297850200000000ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100fd1d010200000001349ef262b9716ba26f5ddf04f9917e3149e16304a8b8b99de6b1e338dee29785020000006a47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac9887c8e7ee5f030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac0000000000000000';

// Mock UTXOs for getAddressBoxes
export const mockAddressUtxos = [
  { tx_hash: txId, tx_pos: 0, height: 5693743, value: 1050000000 },
  { tx_hash: '2nd-tx-id', tx_pos: 1, height: 5693740, value: 525000000 },
  { tx_hash: '3rd-tx-id', tx_pos: 0, height: 5693738, value: 200000000 },
];

export const unspentOutput = {
  tx_hash: txId,
  tx_pos: 0,
  height: 42,
  value: 119595114000,
};

export const expectedAddressBoxes = [
  { txId: txId, index: 0, value: 1050000000n },
  { txId: '2nd-tx-id', index: 1, value: 525000000n },
];

// Balance response
export const balanceResponse = { confirmed: 1775000000, unconfirmed: 0 };
export const expectedAddressBalance = 1775000000n;

// Confirmation
export const expectedTxConfirmation = 4351;

// Block transaction ids
export const blockTxIds = [
  '7b110de3db716e12de71ca59216a84c985c2f5e5c50ae783d2677d9c0df60658',
  '6891a81de933788e1ca8f4735054a86ec4ddf5d768a9dc9057c8d707ea1a9a30',
];

// Fee estimation (FIRO/kB)
export const estimatedFee = 0.01001657;
// Low fee rates around Firo's default min relay fee, where float conversion of
// the `estimatefee` result rounds whole satoshis up
export const lowEstimatedFee = 9.99e-6;
export const minRelayEstimatedFee = 1e-5;
export const doubleMinRelayEstimatedFee = 2e-5;
