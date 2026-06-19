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
    it('should produce correct scripthash for P2PKH address', () => {
      const scripthash = addressToScripthash(testData.lockAddress);

      expect(scripthash).toBe(
        '53787b5ebd3152e257d1ed402ca773aa83fca5981ed9c3b02bf9e5299dd36960',
      );
    });

    it('should produce correct scripthash for P2SH address', () => {
      const scripthash = addressToScripthash(
        '2EdAinnuw3zCy8arpSKRwQYQK2MBC5VMXu9',
      );

      expect(scripthash).toBe(
        '7914236249d96d4931978817b2fe3c9071e8b4daf4decd3087dbba955fd7f66f',
      );
    });

    it('should throw for invalid checksum', () => {
      expect(() =>
        addressToScripthash('THzVvKwY5dAD6gM5z4Mz3jG9RbqhkS8h7W'),
      ).toThrow('checksum');
    });
  });

  it('should parse block headers', () => {
    expect(parseBlockHeader(testData.blockHeaderHex, 42)).toEqual(
      testData.blockInfo,
    );
  });

  it('should parse Firo transaction hex', () => {
    expect(parseTransactionHex(testData.txHex, testData.txId)).toEqual(
      testData.firoTx,
    );
  });

  it('should convert scriptPubKey to ElectrumX scripthash', () => {
    expect(scriptPubKeyToScripthash(testData.lockAddressPublicKey)).toBe(
      '53787b5ebd3152e257d1ed402ca773aa83fca5981ed9c3b02bf9e5299dd36960',
    );
  });
});
