import { TransactionType } from '@rosen-chains/abstract-chain';

export const mockTxId = 'abc123def456789';
export const mockEventId = 'event-123';
export const mockTxBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
export const mockTxType = TransactionType.payment;
export const mockInputUtxos = ['utxo1', 'utxo2', 'utxo3'];

export const coldStorageTransaction = {
  txId: 'cold-tx-id',
  eventId: 'cold-event',
  txBytes: new Uint8Array([9, 10, 11, 12]),
  txType: TransactionType.coldStorage,
  inputUtxos: ['cold-utxo'],
};

export const arbitraryTransaction = {
  txId: 'round-trip-test-id',
  eventId: 'round-trip-event',
  txBytes: new Uint8Array([100, 200, 50, 150]),
  txType: TransactionType.arbitrary,
  inputUtxos: ['utxo-a', 'utxo-b', 'utxo-c'],
};

export const edgeCaseData = {
  longTxId: 'a'.repeat(1000),
  emptyTxBytes: new Uint8Array([]),
  singleByte: new Uint8Array([255]),
  largeTxBytes: new Uint8Array(10000).fill(42),
  manyUtxos: Array.from({ length: 100 }, (_, i) => `utxo-${i}`),
  emptyInputUtxos: [] as string[],
};

export const expectedHexValues = {
  mockTxBytes: '0102030405060708', // [1, 2, 3, 4, 5, 6, 7, 8]
  emptyBytes: '',
  singleByte: 'ff', // [255]
  largeBytesPattern: '2a'.repeat(10000), // 10000 bytes of value 42 (0x2a)
};

export const malformedJsonData = {
  invalidJson: 'invalid json',
  incompleteJson: JSON.stringify({
    txId: 'test',
    // missing required fields
  }),
};
