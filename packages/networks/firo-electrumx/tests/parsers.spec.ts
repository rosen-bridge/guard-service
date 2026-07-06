import { describe, it, expect } from 'vitest';

import {
  addressToScripthash,
  parseBlockHeader,
  parseTransactionHex,
  scriptPubKeyToScripthash,
} from '../lib/parsers';
import * as testData from './testData';

describe('Firo ElectrumX parsers', () => {
  describe('addressToScripthash', () => {
    /**
     * @target `addressToScripthash` should produce correct scripthash for P2PKH address
     * @dependencies
     * - Firo address checksum and script conversion
     * @scenario
     * - convert a valid P2PKH Firo address
     * @expected
     * - it should return the expected ElectrumX scripthash
     */
    it('should produce correct scripthash for P2PKH address', () => {
      const scripthash = addressToScripthash(testData.lockAddress);

      expect(scripthash).toBe(
        '53787b5ebd3152e257d1ed402ca773aa83fca5981ed9c3b02bf9e5299dd36960',
      );
    });

    /**
     * @target `addressToScripthash` should produce correct scripthash for P2SH address
     * @dependencies
     * - Firo address checksum and script conversion
     * @scenario
     * - convert a valid P2SH Firo address
     * @expected
     * - it should return the expected ElectrumX scripthash
     */
    it('should produce correct scripthash for P2SH address', () => {
      const scripthash = addressToScripthash(
        '2EdAinnuw3zCy8arpSKRwQYQK2MBC5VMXu9',
      );

      expect(scripthash).toBe(
        '7914236249d96d4931978817b2fe3c9071e8b4daf4decd3087dbba955fd7f66f',
      );
    });

    /**
     * @target `addressToScripthash` should throw for invalid checksum
     * @dependencies
     * - Firo address checksum validation
     * @scenario
     * - convert an address with an invalid checksum
     * @expected
     * - it should throw a checksum error
     */
    it('should throw for invalid checksum', () => {
      expect(() =>
        addressToScripthash('THzVvKwY5dAD6gM5z4Mz3jG9RbqhkS8h7W'),
      ).toThrow('checksum');
    });
  });

  /**
   * @target `parseBlockHeader` should parse block headers
   * @dependencies
   * - firo-scanner block parser
   * @scenario
   * - parse an 80-byte raw Firo block header
   * @expected
   * - it should return hash and parentHash without height
   */
  it('should parse block headers', () => {
    expect(parseBlockHeader(testData.blockHeaderHex)).toEqual(
      testData.blockInfoWithoutHeight,
    );
  });

  /**
   * @target `parseTransactionHex` should parse Firo transaction hex
   * @dependencies
   * - firo-scanner transaction parser
   * @scenario
   * - parse a raw Firo transaction
   * @expected
   * - it should return inputs and outputs without tx id
   */
  it('should parse Firo transaction hex', () => {
    expect(parseTransactionHex(testData.txHex)).toEqual(
      testData.firoTxWithoutId,
    );
  });

  /**
   * @target `scriptPubKeyToScripthash` should convert scriptPubKey to ElectrumX scripthash
   * @dependencies
   * - SHA-256 hashing
   * @scenario
   * - convert a known Firo lock script
   * @expected
   * - it should return the expected ElectrumX scripthash
   */
  it('should convert scriptPubKey to ElectrumX scripthash', () => {
    expect(scriptPubKeyToScripthash(testData.lockAddressPublicKey)).toBe(
      '53787b5ebd3152e257d1ed402ca773aa83fca5981ed9c3b02bf9e5299dd36960',
    );
  });
});
