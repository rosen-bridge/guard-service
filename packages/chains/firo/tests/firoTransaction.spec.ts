import { expect, describe, it } from 'vitest';

import { TransactionType } from '@rosen-chains/abstract-chain';

import { FIRO_CHAIN } from '../lib/constants';
import FiroTransaction from '../lib/firoTransaction';
import {
  mockTxId,
  mockEventId,
  mockTxBytes,
  mockTxType,
  mockInputUtxos,
  coldStorageTransaction,
  arbitraryTransaction,
  edgeCaseData,
  expectedHexValues,
  malformedJsonData,
} from './transactionTestData';

describe('FiroTransaction', () => {
  describe('Constructor', () => {
    it('should create FiroTransaction instance correctly', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      expect(tx.txId).toBe(mockTxId);
      expect(tx.eventId).toBe(mockEventId);
      expect(tx.txBytes).toEqual(mockTxBytes);
      expect(tx.txType).toBe(mockTxType);
      expect(tx.inputUtxos).toEqual(mockInputUtxos);
      expect(tx.network).toBe(FIRO_CHAIN);
    });

    it('should inherit from PaymentTransaction', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      // Check that it has PaymentTransaction properties
      expect(tx.network).toBeDefined();
      expect(tx.txId).toBeDefined();
      expect(tx.eventId).toBeDefined();
      expect(tx.txBytes).toBeDefined();
      expect(tx.txType).toBeDefined();
    });
  });

  describe('getTxHexString()', () => {
    it('should convert transaction bytes to hex string', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      const hexString = tx.getTxHexString();

      // mockTxBytes: '0102030405060708'
      // Expected hex: [1, 2, 3, 4, 5, 6, 7, 8] -> '0102030405060708'
      expect(hexString).toBe(expectedHexValues.mockTxBytes);
      expect(typeof hexString).toBe('string');
    });

    it('should handle empty transaction bytes', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        edgeCaseData.emptyTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      const hexString = tx.getTxHexString();
      expect(hexString).toBe(expectedHexValues.emptyBytes);
    });

    it('should handle single byte', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        edgeCaseData.singleByte,
        mockTxType,
        mockInputUtxos,
      );

      const hexString = tx.getTxHexString();
      expect(hexString).toBe(expectedHexValues.singleByte);
    });
  });

  describe('toJson()', () => {
    it('should convert FiroTransaction to JSON string', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      const jsonString = tx.toJson();
      const parsed = JSON.parse(jsonString);

      expect(parsed.network).toBe(FIRO_CHAIN);
      expect(parsed.eventId).toBe(mockEventId);
      expect(parsed.txBytes).toBe(expectedHexValues.mockTxBytes); // hex string
      expect(parsed.txId).toBe(mockTxId);
      expect(parsed.txType).toBe(mockTxType);
      expect(parsed.inputUtxos).toEqual(mockInputUtxos);
    });

    it('should create valid JSON that can be parsed', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      const jsonString = tx.toJson();

      // Should not throw when parsing
      expect(() => JSON.parse(jsonString)).not.toThrow();

      const parsed = JSON.parse(jsonString);
      expect(typeof parsed).toBe('object');
    });
  });

  describe('fromJson()', () => {
    it('should create FiroTransaction from JSON string', () => {
      const originalTx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      const jsonString = originalTx.toJson();
      const reconstructedTx = FiroTransaction.fromJson(jsonString);

      expect(reconstructedTx.txId).toBe(mockTxId);
      expect(reconstructedTx.eventId).toBe(mockEventId);
      expect(reconstructedTx.txBytes).toEqual(mockTxBytes);
      expect(reconstructedTx.txType).toBe(mockTxType);
      expect(reconstructedTx.inputUtxos).toEqual(mockInputUtxos);
      expect(reconstructedTx.network).toBe(FIRO_CHAIN);
    });

    it('should handle different transaction types', () => {
      const coldStorageTx = new FiroTransaction(
        coldStorageTransaction.txId,
        coldStorageTransaction.eventId,
        coldStorageTransaction.txBytes,
        coldStorageTransaction.txType,
        coldStorageTransaction.inputUtxos,
      );

      const jsonString = coldStorageTx.toJson();
      const reconstructed = FiroTransaction.fromJson(jsonString);

      expect(reconstructed.txType).toBe(TransactionType.coldStorage);
      expect(reconstructed.txId).toBe(coldStorageTransaction.txId);
      expect(reconstructed.eventId).toBe(coldStorageTransaction.eventId);
    });

    it('should handle empty inputUtxos array', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        edgeCaseData.emptyInputUtxos,
      );

      const jsonString = tx.toJson();
      const reconstructed = FiroTransaction.fromJson(jsonString);

      expect(reconstructed.inputUtxos).toEqual([]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        FiroTransaction.fromJson(malformedJsonData.invalidJson);
      }).toThrow();
    });

    it('should handle malformed JSON object', () => {
      expect(() => {
        FiroTransaction.fromJson(malformedJsonData.incompleteJson);
      }).toThrow();
    });
  });

  describe('Round-trip serialization', () => {
    it('should maintain data integrity through toJson -> fromJson cycle', () => {
      const originalTx = new FiroTransaction(
        arbitraryTransaction.txId,
        arbitraryTransaction.eventId,
        arbitraryTransaction.txBytes,
        arbitraryTransaction.txType,
        arbitraryTransaction.inputUtxos,
      );

      // Serialize to JSON and deserialize
      const jsonString = originalTx.toJson();
      const reconstructed = FiroTransaction.fromJson(jsonString);

      // All properties should be identical
      expect(reconstructed.txId).toBe(originalTx.txId);
      expect(reconstructed.eventId).toBe(originalTx.eventId);
      expect(reconstructed.txBytes).toEqual(originalTx.txBytes);
      expect(reconstructed.txType).toBe(originalTx.txType);
      expect(reconstructed.inputUtxos).toEqual(originalTx.inputUtxos);
      expect(reconstructed.network).toBe(originalTx.network);

      // Methods should work the same
      expect(reconstructed.getTxHexString()).toBe(originalTx.getTxHexString());
    });

    it('should handle multiple round trips', () => {
      let tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      // Do 3 round trips
      for (let i = 0; i < 3; i++) {
        const jsonString = tx.toJson();
        tx = FiroTransaction.fromJson(jsonString);
      }

      expect(tx.txId).toBe(mockTxId);
      expect(tx.eventId).toBe(mockEventId);
      expect(tx.txBytes).toEqual(mockTxBytes);
      expect(tx.txType).toBe(mockTxType);
      expect(tx.inputUtxos).toEqual(mockInputUtxos);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle very long transaction IDs', () => {
      const tx = new FiroTransaction(
        edgeCaseData.longTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      expect(tx.txId).toBe(edgeCaseData.longTxId);

      const jsonString = tx.toJson();
      const reconstructed = FiroTransaction.fromJson(jsonString);
      expect(reconstructed.txId).toBe(edgeCaseData.longTxId);
    });

    it('should handle large transaction bytes', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        edgeCaseData.largeTxBytes,
        mockTxType,
        mockInputUtxos,
      );

      expect(tx.txBytes).toEqual(edgeCaseData.largeTxBytes);

      const hexString = tx.getTxHexString();
      // 10000 bytes * 2 hex chars
      expect(hexString.length).toBe(20000);

      // Check that the hex string contains only '2a' characters (hex for 42)
      expect(hexString).toBe(expectedHexValues.largeBytesPattern);
    });

    it('should handle many input UTXOs', () => {
      const tx = new FiroTransaction(
        mockTxId,
        mockEventId,
        mockTxBytes,
        mockTxType,
        edgeCaseData.manyUtxos,
      );

      expect(tx.inputUtxos).toHaveLength(100);
      expect(tx.inputUtxos[0]).toBe('utxo-0');
      expect(tx.inputUtxos[99]).toBe('utxo-99');

      const jsonString = tx.toJson();
      const reconstructed = FiroTransaction.fromJson(jsonString);
      expect(reconstructed.inputUtxos).toEqual(edgeCaseData.manyUtxos);
    });
  });
});