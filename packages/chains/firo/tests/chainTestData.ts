import { RosenTokens } from '@rosen-bridge/tokens';

import { FiroConfigs } from '../lib/types';

export const testFiroConfigs: FiroConfigs = {
  fee: 1000n,
  confirmations: {
    observation: 6,
    payment: 6,
    cold: 12,
    manual: 6,
    arbitrary: 6,
  },
  addresses: {
    lock: 'aD3AxfMEsFmjJd75bHLN2GH8ob2T5Awz4m',
    cold: 'aLp9d4hLZzpF2wec2HrQNGme62Aqf85pvd',
    permit: 'permit',
    fraud: 'fraud',
  },
  rwtId: 'firo-rwt-token-id',
  txFeeSlippage: 0.1,
  aggregatedPublicKey:
    '022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037',
};

// Test UTXOs for transaction building
export const testUtxos = [
  {
    txId: 'f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba8',
    index: 0,
    value: 10000000n, // 0.1 FIRO
    address: 'aD7ns9EUg4tUd6S5yQYh3ieyfmWWbwCaM7',
    scriptPubKey: '76a914880b0a854c3b5f23d208a9378064232a32067d7188ac',
  },
  {
    txId: '98f7ecc5b17fa795ceb45809918e726d50a42fdb9207f40d8a0fe0dcf0f57b70',
    index: 0,
    value: 4000000000n, // 40 FIRO (coinbase from block 1)
    address: 'aLUaHXSZpfgHjzuP64vUJF5B6Pqi7Xtptn',
    scriptPubKey: '76a914e01ba8d0b76671b3fb5ccef7ba52cec4d7b65ecd88ac',
  },
  {
    txId: '98f7ecc5b17fa795ceb45809918e726d50a42fdb9207f40d8a0fe0dcf0f57b70',
    index: 2,
    value: 200000000n, // 2 FIRO (from block 1)
    address: 'aKgLGLMuKwVKJfxH3H1HKPLLCdSUu9k1Mp',
    scriptPubKey: '76a914a27ee8acbfb5a2e86dd2e6c86b86e624d5dd906288ac',
  },
];

// Large UTXOs for testing asset calculations
export const largeTestUtxos = [
  {
    txId: '98f7ecc5b17fa795ceb45809918e726d50a42fdb9207f40d8a0fe0dcf0f57b70',
    index: 0,
    value: 4000000000n, // 40 FIRO
    address: 'aLUaHXSZpfgHjzuP64vUJF5B6Pqi7Xtptn',
    scriptPubKey: '76a914e01ba8d0b76671b3fb5ccef7ba52cec4d7b65ecd88ac',
    txHex:
      '01000000017af0d5f7b6fc3aa277e54a16f372f71e33cf9fb3632227397a1715008fb05836010000006b48304502210081c051556843abc8bfec58fd8bb6a9600f32944bf1d071998b16c42b399e7bb702200ab5c55de9a43967fe7c7f7726fabe2a34b097eb4223c4440d2dffab7e43d0c50121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030065cd1d000000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000000000e6a0c48656c6c6f20526f73656e21480752bc030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000',
  },
  {
    txId: 'f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba8',
    index: 0,
    value: 10000000n, // 0.1 FIRO
    address: 'aD7ns9EUg4tUd6S5yQYh3ieyfmWWbwCaM7',
    scriptPubKey: '76a914880b0a854c3b5f23d208a9378064232a32067d7188ac',
    txHex:
      '02000000015de5e7ecd6c60bf37591d4c23a6747644040b71edbe209231542c848c7ef737f020000006a473044022069ef1e50e6cd355179f68cdf42e7f68ff442a005b4906f40aa846d945208eaf1022037ce2ecc0c294eb46f875bac50edffbe610247a2769c5dc2ad8e8f18f6155daf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc82944d3020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000',
  },
];

// Transaction 2 inputs (from Doge testData structure for signTransaction test)
export const transaction2Input0BoxId =
  'a2623a8e6358b44df7c672cee5a6ff1df2b45721b2f506d22ef59a0634f7641d.0';
export const transaction2Input1BoxId =
  'f7fdbfcb582dd9e34997df257bfff291c1ea98a5622ba18400794f3337113b0e.2';

// Hash messages and signatures for signing tests
// Lock script used: 76a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac
// These hashes are computed from the PSBT inputs using the actual lock script in the PSBT
export const transaction2HashMessage0 =
  'ac36493a67e171161c0b33a0414af459cbd49955453ef68cbf55737567457d39';
export const transaction2Signature0 =
  '9a589b1cb889e0796cff6de767790866822bd45356425b7c4c4e4efcef4e6ea3310bbc0a5fcfca1f84822e5eaaa665edcf817b1320e2229303d0caf877a2f1ac';
export const transaction2HashMessage1 =
  '0c51a346037390c214ddb9c4b28aa44d7911553066ffa6ce77d1ff1b0fff0dc0';
export const transaction2Signature1 =
  'b97a8f630779b1be32108edaa09e8c57bb0efd19b96f76cf1ab5eed592433f257f61878cb0bb3ef40c27cc38d5332b1ac5d2e34120cd244d107d5881f8c2fddf';
export const transaction2SignedTxBytesHex =
  '70736274ff0100a002000000021d64f734069af52ed206f5b22157b4f21dffa6e5ce72c6f74db458638e3a62a20000000000ffffffff0e3b1137334f790084a12b62a598eac191f2ff7b25df9749e3d92d58cbbffdf70200000000ffffffff0200e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc853b9e8020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100f901000000017af0d5f7b6fc3aa277e54a16f372f71e33cf9fb3632227397a1715008fb05836010000006b48304502210081c051556843abc8bfec58fd8bb6a9600f32944bf1d071998b16c42b399e7bb702200ab5c55de9a43967fe7c7f7726fabe2a34b097eb4223c4440d2dffab7e43d0c50121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030065cd1d000000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000000000e6a0c48656c6c6f20526f73656e21480752bc030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac0000000001076b4830450221009a589b1cb889e0796cff6de767790866822bd45356425b7c4c4e4efcef4e6ea30220310bbc0a5fcfca1f84822e5eaaa665edcf817b1320e2229303d0caf877a2f1ac0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037000100fd1f0102000000015de5e7ecd6c60bf37591d4c23a6747644040b71edbe209231542c848c7ef737f020000006a473044022069ef1e50e6cd355179f68cdf42e7f68ff442a005b4906f40aa846d945208eaf1022037ce2ecc0c294eb46f875bac50edffbe610247a2769c5dc2ad8e8f18f6155daf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc82944d3020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac0000000001076b483045022100b97a8f630779b1be32108edaa09e8c57bb0efd19b96f76cf1ab5eed592433f2502207f61878cb0bb3ef40c27cc38d5332b1ac5d2e34120cd244d107d5881f8c2fddf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037000000';

// Unsigned payment transaction for signTransaction test (exact Doge structure adapted for Firo)
export const transaction2PaymentTransaction = `{
  "network": "firo",
  "eventId": "",
  "txBytes": "70736274ff0100a002000000021d64f734069af52ed206f5b22157b4f21dffa6e5ce72c6f74db458638e3a62a20000000000ffffffff0e3b1137334f790084a12b62a598eac191f2ff7b25df9749e3d92d58cbbffdf70200000000ffffffff0200e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc853b9e8020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100f901000000017af0d5f7b6fc3aa277e54a16f372f71e33cf9fb3632227397a1715008fb05836010000006b48304502210081c051556843abc8bfec58fd8bb6a9600f32944bf1d071998b16c42b399e7bb702200ab5c55de9a43967fe7c7f7726fabe2a34b097eb4223c4440d2dffab7e43d0c50121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030065cd1d000000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000000000e6a0c48656c6c6f20526f73656e21480752bc030000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000100fd1f0102000000015de5e7ecd6c60bf37591d4c23a6747644040b71edbe209231542c848c7ef737f020000006a473044022069ef1e50e6cd355179f68cdf42e7f68ff442a005b4906f40aa846d945208eaf1022037ce2ecc0c294eb46f875bac50edffbe610247a2769c5dc2ad8e8f18f6155daf0121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff030000000000000000356a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600e1f505000000001976a9145d0e02100e393220f90ffce4485f809de4ff777c88acc82944d3020000001976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000000000",
  "txId": "e7bb0677b2a0542e3ecb8d3f29ea91ae3500b05201f1e97e6bef7e724c4aa476",
  "txType": "manual",
  "inputUtxos": [
    "{\\"txId\\":\\"a2623a8e6358b44df7c672cee5a6ff1df2b45721b2f506d22ef59a0634f7641d\\",\\"index\\":0,\\"value\\":500000000}",
    "{\\"txId\\":\\"f7fdbfcb582dd9e34997df257bfff291c1ea98a5622ba18400794f3337113b0e\\",\\"index\\":2,\\"value\\":12134394312}"
  ]
}`;
// Valid transaction with correct change box for verifyTransactionExtraConditions test
export const validChangeBoxPaymentTransaction = `{
  "network": "firo",
  "eventId": "",
  "txBytes": [112,115,98,116,255,1,0,85,2,0,0,0,1,241,43,240,89,245,125,246,223,6,211,107,111,14,119,158,220,66,12,22,173,126,203,230,228,200,111,30,109,164,78,123,168,0,0,0,0,0,255,255,255,255,1,152,146,152,0,0,0,0,0,25,118,169,20,135,43,103,200,39,10,158,175,92,42,191,99,42,243,222,169,137,210,227,113,136,172,0,0,0,0,0,1,1,34,128,150,152,0,0,0,0,0,25,118,169,20,135,43,103,200,39,10,158,175,92,42,191,99,42,243,222,169,137,210,227,113,136,172,0,0],
  "txId": "validChangeBoxTxId",
  "txType": "payment",
  "inputUtxos": [
    "{\\\\\\\\\\"txId\\\\\\\\\\":\\\\\\\\\\"a87b4ea46d1e6fc8e4e6cb7ead160c42dc9e770e6f6bd306dff67df559f02bf1\\\\\\\\\\",\\\\\\\\\\"index\\\\\\\\\\":0,\\\\\\\\\\"value\\\\\\\\\\":10000000}"
  ]
}`;
// Invalid transaction with wrong change box address (aJnZc2GfHvwgNUC481EF18fkfcE9vP1EuS instead of lock address)
export const invalidChangeBoxPaymentTransaction = `{
  "network": "firo",
  "eventId": "",
  "txBytes": [112,115,98,116,255,1,0,85,2,0,0,0,1,241,43,240,89,245,125,246,223,6,211,107,111,14,119,158,220,66,12,22,173,126,203,230,228,200,111,30,109,164,78,123,168,0,0,0,0,0,255,255,255,255,1,152,146,152,0,0,0,0,0,25,118,169,20,198,56,210,179,242,125,117,12,80,170,234,247,48,11,57,111,0,179,52,188,136,172,0,0,0,0,0,1,1,34,128,150,152,0,0,0,0,0,25,118,169,20,135,43,103,200,39,10,158,175,92,42,191,99,42,243,222,169,137,210,227,113,136,172,0,0],
  "txId": "invalidChangeBoxTxId",
  "txType": "payment",
  "inputUtxos": [
    "{\\\\\\\\\\"txId\\\\\\\\\\":\\\\\\\\\\"a87b4ea46d1e6fc8e4e6cb7ead160c42dc9e770e6f6bd306dff67df559f02bf1\\\\\\\\\\",\\\\\\\\\\"index\\\\\\\\\\":0,\\\\\\\\\\"value\\\\\\\\\\":10000000}"
  ]
}`; // Token map for testing
export const testTokenMapRosen: RosenTokens = [];

// Multi-decimal token map for wrapping tests
export const multiDecimalTokenMap: RosenTokens = [
  {
    ergo: {
      tokenId:
        '1c7435e608ab710c56bbe0f635e2a5e86ddf856f7d3d2d1d4dfefa62fbbfb9b4',
      name: 'testFIRO',
      decimals: 3,
      type: 'EIP-004',
      residency: 'wrapped',
      extra: {},
    },
    firo: {
      tokenId: 'firo',
      name: 'FIRO',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
  },
];

// Box mapping for transaction2 - maps inputs to change output
export const transaction2BoxMapping = [
  {
    inputId: transaction2Input0BoxId,
    serializedOutput:
      '{"txId":"5aeb5c966027a82ca773a626f240ee5e59bf19b5824d013264be01e66242910b","index":1,"value":12494394312}',
  },
  {
    inputId: transaction2Input1BoxId,
    serializedOutput:
      '{"txId":"5aeb5c966027a82ca773a626f240ee5e59bf19b5824d013264be01e66242910b","index":1,"value":12494394312}',
  },
];

// Transaction assets without wrapping (getTransactionAssets returns input value for both input and output)
export const transaction2Assets = {
  inputAssets: {
    nativeToken: 12634394312n,
    tokens: [],
  },
  outputAssets: {
    nativeToken: 12634394312n, // Same as input (implementation sums inputs only)
    tokens: [],
  },
};

// Transaction assets with wrapping (8 decimals -> 3 decimals, divide by 10^5)
export const transaction2WrappedAssets = {
  inputAssets: {
    nativeToken: 126344n, // 12634394312n / 10^5
    tokens: [],
  },
  outputAssets: {
    nativeToken: 126344n, // Same as input
    tokens: [],
  },
};

// Payment order for transaction GENERATION tests (only the payment output, no change)
export const transaction2Order = [
  {
    address: 'a9CVN3PvDiQ7qWCH5WN7yuEiNR3CrvGVJC',
    assets: {
      nativeToken: 100000000n, // 1 FIRO
      tokens: [],
    },
  },
];

// Wrapped orders for extraction tests
export const transaction2WrappedExtractionOrder = [
  {
    address: 'a9CVN3PvDiQ7qWCH5WN7yuEiNR3CrvGVJC',
    assets: {
      nativeToken: 1000n,
      tokens: [],
    },
  },
];
