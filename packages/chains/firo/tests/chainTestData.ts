import { Psbt } from 'bitcoinjs-lib';
import { vi } from 'vitest';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { TokenMap, RosenTokens } from '@rosen-bridge/tokens';

import { FIRO_NETWORK } from '../lib/constants';
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
    lock: 'aD5CwCytFCw8AE76rDiAKQqHghNatNLU4X',
    cold: 'aLp9d4hLZzpF2wec2HrQNGme62Aqf85pvd',
    permit: 'a4xfC8Ci6hBPW6Huuzjzvw86rBjgnsLseP',
    fraud: 'a5DaG9nwf1Hj6dpyShX8YqEgFzqs5HFEKR',
  },
  rwtId: 'firo-rwt-token-id',
  txFeeSlippage: 0.1,
  aggregatedPublicKey:
    '03a452f79511629afbbe437e0eb69f5cd4c3d0a331fbe386c170a5939eb3f3fe6e',
};

export const testAddress1 = 'a8XYZTa8UsWjDmYFczEe1nm7cpYvL3yz3H';

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

// Real address patterns from Firo network
export const realFiroAddresses = {
  generated: 'aMi6JC7tb8LJbsf3DikYa6awC5RN733oV8',
  coinbase: 'aLUaHXSZpfgHjzuP64vUJF5B6Pqi7Xtptn',
  testAddress: 'aJnZc2GfHvwgNUC481EF18fkfcE9vP1EuS',
  utxoAddress: 'aD7ns9EUg4tUd6S5yQYh3ieyfmWWbwCaM7',
};

// Mock values for Firo chain tests
export const MOCK_VALUES = {
  CHAIN: 'firo',
  NATIVE_TOKEN_ID: 'firo',
  defaultNativeToken: 1000000000n, // 10 FIRO
  lockAddressBalance: 10000000000n, // 100 FIRO
  feeRatio: 1000n,
  // Valid raw transaction hex for txId 98f7ecc5b17fa795ceb45809918e726d50a42fdb9207f40d8a0fe0dcf0f57b70
  txHex98f7:
    '0200000001000000000000000000000000000000000000000000000000000000000000000000000000ffffffff0100c817ee0e0000001976a914e01ba8d0b76671b3fb5ccef7ba52cec4d7b65ecd88ac00000000',
  // Valid raw transaction hex for txId f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba8
  txHexf12b:
    '0200000001000000000000000000000000000000000000000000000000000000000000000000000000ffffffff018096980000000000001976a914880b0a854c3b5f23d208a9378064232a32067d7188ac00000000',
};

// Test transaction IDs and event IDs - using realistic Firo transaction patterns
export const TEST_IDS = {
  txId: 'test-tx-id',
  eventId: 'test-event',
  jsonEventId: 'test-event-3',
  jsonTxId: 'test-id',
  // Specific transaction IDs for various test scenarios
  validUnspentTx: 'valid-unspent-tx',
  spentInputsTx: 'spent-inputs-tx',
  feeVerificationTx: 'fee-verification-tx',
  unsignedSigningTx: 'unsigned-signing-tx',
  signedTx: 'signed-tx',
  extractTestTx: 'extract-test-tx',
  noBurnTestTx: 'no-burn-test-tx',
  verifyConditionsTx: 'verify-conditions-tx',
  lockTxTest: 'lock-tx-test',
  // Real Firo network transaction ID for testing
  realFiroTxId:
    '462d8f9ab8cf8ed3f26910b39cdbaec6ebb4cbcccb8cc76552b21fb5805baf4d',
};

export const transaction2PaymentTransaction = `{
  "network": "firo",
  "eventId": "",
  "txBytes": [112, 115, 98, 116, 255, 1, 0, 85, 2, 0, 0, 0, 1, 241, 43, 240, 89, 245, 125, 246, 223, 6, 211, 107, 111, 14, 119, 158, 220, 66, 12, 22, 173, 126, 203, 230, 228, 200, 111, 30, 109, 164, 78, 123, 168, 0, 0, 0, 0, 0, 255, 255, 255, 255, 1, 152, 146, 152, 0, 0, 0, 0, 0, 25, 118, 169, 20, 74, 202, 121, 116, 179, 176, 102, 91, 154, 243, 123, 150, 131, 83, 71, 33, 53, 215, 177, 216, 136, 172, 0, 0, 0, 0, 0, 1, 1, 34, 128, 150, 152, 0, 0, 0, 0, 0, 25, 118, 169, 20, 74, 202, 121, 116, 179, 176, 102, 91, 154, 243, 123, 150, 131, 83, 71, 33, 53, 215, 177, 216, 136, 172, 0, 0],
  "txId": "462d8f9ab8cf8ed3f26910b39cdbaec6ebb4cbcccb8cc76552b21fb5805baf4d",
  "txType": "payment",
  "inputUtxos": [
    "{\\"txId\\":\\"a87b4ea46d1e6fc8e4e6cb7ead160c42dc9e770e6f6bd306dff67df559f02bf1\\",\\"index\\":0,\\"value\\":10000000}"
  ]
}`;

export const REAL_PSBT_DATA = {
  // Valid PSBT transaction with proper structure that can be parsed
  validPsbt: [
    112, 115, 98, 116, 255, 1, 0, 85, 2, 0, 0, 0, 1, 241, 43, 240, 89, 245, 125,
    246, 223, 6, 211, 107, 111, 14, 119, 158, 220, 66, 12, 22, 173, 126, 203,
    230, 228, 200, 111, 30, 109, 164, 78, 123, 168, 0, 0, 0, 0, 0, 255, 255,
    255, 255, 1, 152, 146, 152, 0, 0, 0, 0, 0, 25, 118, 169, 20, 74, 202, 121,
    116, 179, 176, 102, 91, 154, 243, 123, 150, 131, 83, 71, 33, 53, 215, 177,
    216, 136, 172, 0, 0, 0, 0, 0, 1, 1, 34, 128, 150, 152, 0, 0, 0, 0, 0, 25,
    118, 169, 20, 74, 202, 121, 116, 179, 176, 102, 91, 154, 243, 123, 150, 131,
    83, 71, 33, 53, 215, 177, 216, 136, 172, 0, 0,
  ],

  // Minimal PSBT for basic tests that don't need complex validation
  minimalPsbt: [
    112, 115, 98, 116, 255, 1, 0, 10, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],

  // Hex representation for tests that need hex strings
  validPsbtHex:
    '70736274ff0100550200000001f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba80000000000ffffffff0198929800000000001976a9144aca7974b3b0665b9af37b968353472135d7b1d888ac000000000001012280969800000000001976a9144aca7974b3b0665b9af37b968353472135d7b1d888ac0000',

  // Metadata for understanding the PSBT structure
  metadata: {
    inputTxId:
      'a87b4ea46d1e6fc8e4e6cb7ead160c42dc9e770e6f6bd306dff67df559f02bf1',
    inputIndex: 0,
    inputAmount: 10000000, // 0.1 FIRO in satoshis
    outputAmount: 9999000, // 0.09999 FIRO in satoshis
    fee: 1000, // 0.00001 FIRO fee
    description:
      'Valid PSBT structure with 1 input and 1 output that can be parsed by bitcoinjs-lib',
  },
};

// Export individual arrays for convenience
export const VALID_PSBT_BYTES = REAL_PSBT_DATA.validPsbt;
export const MINIMAL_PSBT_BYTES = REAL_PSBT_DATA.minimalPsbt;
export const VALID_PSBT_HEX = REAL_PSBT_DATA.validPsbtHex;

// Mock transaction bytes using REAL PSBT data from Firo CLI
export const MOCK_TRANSACTION_BYTES = {
  // Keep simple for basic tests that don't need PSBT parsing
  simple: new Uint8Array([1, 2, 3, 4]),
  empty: new Uint8Array([]),

  // Real PSBT data generated from Firo CLI - this will actually parse correctly!
  validPsbt: new Uint8Array(VALID_PSBT_BYTES),

  // Minimal valid PSBT for tests that need basic PSBT structure
  minimalPsbt: new Uint8Array(MINIMAL_PSBT_BYTES),

  // Signed PSBT (using same structure as validPsbt for now)
  signedPsbt: new Uint8Array(VALID_PSBT_BYTES),

  // Invalid PSBT for error testing
  invalidPsbt: new Uint8Array([0x70, 0x73, 0x62, 0x74, 0x00]), // Wrong magic bytes

  // Test PSBT hex for rawTxToPaymentTransaction test
  testPsbtHex: VALID_PSBT_HEX,
};

// Finalized (signed) PSBT for testing
// This is created by taking the unsigned PSBT and manually finalizing it
const createFinalizedPsbt = (): Uint8Array => {
  const psbt = Psbt.fromHex(VALID_PSBT_HEX, { network: FIRO_NETWORK });

  // Mock finalize the inputs by adding dummy scriptSig
  for (let i = 0; i < psbt.data.inputs.length; i++) {
    // Add a minimal valid scriptSig (OP_0 - represents a signed input)
    psbt.updateInput(i, {
      finalScriptSig: Buffer.from([0x00]), // Minimal valid script
    });
  }

  return psbt.toBuffer();
};

const SIGNED_PSBT_BYTES = createFinalizedPsbt();

export const transactionSignedPaymentTransaction = JSON.stringify({
  network: 'firo',
  eventId: 'signed-test-event',
  txBytes: Array.from(SIGNED_PSBT_BYTES)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''),
  txId: '50e0c692c976a3e52dc20f43c6fd9ab0896f17faf0beec18ec4e2dea026ec999',
  txType: 0, // TransactionType.payment
  inputUtxos: [
    'f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba8.0',
  ],
});

// Mock signatures for TSS tests
export const MOCK_SIGNATURES = {
  signature: 'mock-signature-hex-data-for-firo-transaction',
  signatureRecovery: 'mock-recovery-data-for-signature-verification',
};

// Address validation patterns
export const ADDRESS_PATTERNS = {
  firoAddress: /^a[a-zA-Z0-9]{33}$/,
};

// Factory function to create mock network
export const createMockNetwork = () => ({
  notImplemented: () => {
    throw Error('Not mocked');
  },
  getHeight: vi.fn(),
  getTxConfirmation: vi.fn(),
  getAddressAssets: vi.fn().mockResolvedValue({
    nativeToken: MOCK_VALUES.defaultNativeToken,
    tokens: [],
  }),
  getBlockTransactionIds: vi.fn(),
  getBlockInfo: vi.fn(),
  getTransaction: vi.fn(),
  submitTransaction: vi.fn(),
  getAddressBoxes: vi.fn(),
  isBoxUnspentAndValid: vi.fn(),
  getUtxo: vi.fn(),
  getFeeRatio: vi.fn(),
  isTxInMempool: vi.fn(),
  getTransactionHex: vi.fn(),
  getMempoolTransactions: vi.fn().mockResolvedValue([]),
  getTokenDetail: vi
    .fn()
    .mockRejectedValue(new Error('Firo network does not support tokens')),
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    child: vi.fn().mockReturnValue({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      critical: vi.fn(),
      child: vi.fn(),
    }),
  },
  getActualTxId: vi
    .fn()
    .mockImplementation((hash: string) => Promise.resolve(hash)),
});

type TestFiroConfigs = {
  addresses: {
    lock: string;
  };
};

type TestUtxo = unknown;

// Factory function to create mock network with transaction generation setup
export const createMockNetworkWithTransactionSetup = (
  testFiroConfigs: TestFiroConfigs,
  testUtxos: TestUtxo[],
) => {
  const network = createMockNetwork();

  // Setup mocks for transaction generation
  network.getFeeRatio.mockResolvedValue(MOCK_VALUES.feeRatio);
  network.getAddressBoxes.mockResolvedValue(testUtxos);
  network.getTransactionHex.mockImplementation(async (txId: string) => {
    // Return appropriate transaction hex based on txId
    if (
      txId ===
      '98f7ecc5b17fa795ceb45809918e726d50a42fdb9207f40d8a0fe0dcf0f57b70'
    ) {
      return MOCK_VALUES.txHex98f7;
    }
    if (
      txId ===
      'f12bf059f57df6df06d36b6f0e779edc420c16ad7ecbe6e4c86f1e6da44e7ba8'
    ) {
      return MOCK_VALUES.txHexf12b;
    }
    // Default valid transaction hex for any unknown txId
    return '0200000001000000000000000000000000000000000000000000000000000000000000000000000000ffffffff0100e1f50500000000001976a914000000000000000000000000000000000000000088ac00000000';
  });

  // Mock getAddressAssets to return sufficient assets for the lock address
  network.getAddressAssets.mockImplementation(async (address: string) => {
    // Return high balance for lock address, lower for others
    if (address === testFiroConfigs.addresses.lock) {
      return {
        nativeToken: MOCK_VALUES.lockAddressBalance,
        tokens: [],
      };
    }
    return {
      nativeToken: MOCK_VALUES.defaultNativeToken,
      tokens: [],
    };
  });

  return network;
};

// Factory function to create mock network with insufficient assets
export const createMockNetworkInsufficientAssets = () => {
  const network = createMockNetwork();
  network.getAddressBoxes.mockResolvedValue([]);
  return network;
};

// Factory function to create mock network for mempool tests
export const createMockNetworkForMempool = (inMempool: boolean = true) => {
  const network = createMockNetwork();
  network.isTxInMempool.mockResolvedValue(inMempool);
  return network;
};

// Factory function to create mock token map
export const createMockTokenMap = () => {
  const tokenMap = new TokenMap();

  vi.spyOn(tokenMap, 'wrapAmount').mockImplementation(
    (tokenId: string, amount: bigint) => ({
      amount,
      tokenId,
      decimals: 8,
    }),
  );

  vi.spyOn(tokenMap, 'unwrapAmount').mockImplementation(
    (tokenId: string, amount: bigint) => ({
      amount,
      tokenId,
      decimals: 8,
    }),
  );

  vi.spyOn(tokenMap, 'getID').mockReturnValue(MOCK_VALUES.CHAIN);

  vi.spyOn(tokenMap, 'search').mockReturnValue([]);

  vi.spyOn(tokenMap, 'getSignificantDecimals').mockReturnValue(8);

  return tokenMap;
};

export const testTokenMapRosen: RosenTokens = [];
export const testTokenMap = createMockTokenMap();

// Factory function to create mock logger
export const createMockLogger = (): AbstractLogger => {
  const mock = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    // child should return another logger (or same mocked instance)
    child: vi.fn().mockImplementation(() => mock),
  } as unknown as AbstractLogger;

  return mock;
};

// Payment order for transaction generation tests
export const transaction2Order = [
  {
    address: realFiroAddresses.testAddress,
    assets: {
      nativeToken: 900000000n, // 9 FIRO
      tokens: [],
    },
  },
];
