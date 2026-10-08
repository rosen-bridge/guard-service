import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import { TransactionType } from '@rosen-chains/abstract-chain';

import BitcoinCashTransaction from '../lib/bitcoinCashTransaction';
import {
  buildBchSignedTransaction,
  decodeBchTransaction,
  getBchActualTxId,
  getBchApprovalTxId,
  getBchSigningDigest,
} from '../lib/bitcoinCashUtils';
import { BCH_MAX_ENVELOPE_CHARACTERS } from '../lib/constants';
import {
  approvalId,
  parentHex,
  publicKey,
  treasuryScript,
} from './bitcoinCashTestData';
import { mutate, signatures, signed } from './bitcoinCashTestUtils';
import { prevouts, privateKey, unsigned } from './bitcoinCashTestUtils';

/**
 * Wrap a fresh fixed unsigned vector with its native parent context.
 * @returns A token-free unsigned payment envelope
 */
const envelope = () =>
  new BitcoinCashTransaction(
    'test-event',
    unsigned(),
    TransactionType.payment,
    prevouts(),
    publicKey,
  );

describe('BitcoinCashTransaction', () => {
  describe('constructor', () => {
    /**
     * @target BitcoinCashTransaction.constructor - preserves Buffer-backed
     * bytes and identities across parsing and signing
     * @dependencies bitcoinCashUtils helpers, Buffer-backed two-parent signed
     * fixture and ordinary Uint8Array references
     * @scenario Repeatedly decode/hash/digest Buffer bytes, sign them and
     * restore the resulting envelope JSON.
     * @expected Preserve original buffers and match ordinary approval IDs,
     * actual IDs, digests and signed state.
     */
    it('preserves Buffer-backed bytes and identities across parsing and signing', () => {
      const inputs = prevouts();
      const secondParent = decodeBchTransaction(hexToBin(parentHex));
      secondParent.locktime = 1;
      const secondParentBytes = encodeTransactionBCH(secondParent);
      inputs[1].parentTransactionHex = binToHex(secondParentBytes);
      inputs[1].txId = hashTransaction(secondParentBytes);
      const ordinary = mutate((tx) => {
        tx.inputs[1].outpointTransactionHash = hexToBin(inputs[1].txId);
      });
      const originalHex = binToHex(ordinary);
      const buffered = Buffer.from(ordinary);
      const expectedApproval = getBchApprovalTxId(ordinary);
      const expectedActual = getBchActualTxId(ordinary);
      const expectedDigests = [0, 1].map((index) =>
        getBchSigningDigest(ordinary, inputs, treasuryScript, index),
      );

      for (let repeat = 0; repeat < 2; repeat++) {
        decodeBchTransaction(buffered);
        expect(buffered.toString('hex')).toEqual(originalHex);
        expect(getBchApprovalTxId(buffered)).toEqual(expectedApproval);
        expect(getBchActualTxId(buffered)).toEqual(expectedActual);
        [0, 1].forEach((index) => {
          expect(
            binToHex(
              getBchSigningDigest(buffered, inputs, treasuryScript, index),
            ),
          ).toEqual(binToHex(expectedDigests[index]));
        });
        expect(buffered.toString('hex')).toEqual(originalHex);
      }

      const compactSignatures = expectedDigests.map((messageHash) => {
        const signature = secp256k1.signMessageHashCompact(
          privateKey,
          messageHash,
        );
        if (typeof signature === 'string') throw Error(signature);
        return binToHex(signature);
      });
      const expectedSigned = buildBchSignedTransaction(
        ordinary,
        inputs,
        publicKey,
        compactSignatures,
      );
      const signedBuffer = Buffer.from(expectedSigned);
      const signedHex = signedBuffer.toString('hex');
      const envelopeFromBuffer = new BitcoinCashTransaction(
        'buffer-event',
        signedBuffer,
        TransactionType.payment,
        inputs,
        publicKey,
      );
      const restored = BitcoinCashTransaction.fromJson(
        envelopeFromBuffer.toJson(),
      );
      expect(envelopeFromBuffer.txId).toEqual(expectedApproval);
      expect(envelopeFromBuffer.getActualTxId()).toEqual(
        getBchActualTxId(expectedSigned),
      );
      expect(restored.toJson()).toEqual(envelopeFromBuffer.toJson());
      expect(restored.isSigned()).toEqual(true);
      expect(restored.getActualTxId()).toEqual(
        envelopeFromBuffer.getActualTxId(),
      );
      expect(signedBuffer.toString('hex')).toEqual(signedHex);
    });

    /**
     * @target BitcoinCashTransaction.constructor - copies mutable caller
     * bytes/prevouts and detects later envelope mutation
     * @dependencies Fresh unsigned bytes and prevouts passed into a new
     * envelope
     * @scenario Mutate caller-owned buffers/context, then mutate the
     * envelope's own byte array.
     * @expected Keep the original approval valid after caller mutations and
     * reject later envelope mutation.
     */
    it('copies mutable caller bytes/prevouts and detects later envelope mutation', () => {
      const bytes = unsigned();
      const inputs = prevouts();
      const tx = new BitcoinCashTransaction(
        'event',
        bytes,
        TransactionType.payment,
        inputs,
        publicKey,
      );
      bytes[0] = 3;
      inputs[0].value = 1n;
      expect(tx.txId).toEqual(approvalId);
      expect(() => tx.toJson()).not.toThrow();
      tx.txBytes[0] = 3;
      expect(() => tx.toJson()).toThrow();
    });
  });

  describe('fromJson', () => {
    /**
     * @target BitcoinCashTransaction.fromJson - restores exact unsigned and
     * signed state from canonical JSON
     * @dependencies Unsigned envelope, synthetic signatures and canonical
     * toJson output
     * @scenario Round-trip unsigned state, then signed state with the same
     * approval context.
     * @expected Preserve exact JSON, approval/actual identity, signature
     * status and ordered prevouts.
     */
    it('restores exact unsigned and signed state from canonical JSON', () => {
      const tx = envelope();
      expect(tx.isSigned()).toEqual(false);
      expect(tx.getActualTxId()).toBeUndefined();
      expect(BitcoinCashTransaction.fromJson(tx.toJson()).toJson()).toEqual(
        tx.toJson(),
      );
      const result = tx.withSignatures(signatures());
      const restored = BitcoinCashTransaction.fromJson(result.toJson());
      expect(restored.toJson()).toEqual(result.toJson());
      expect(restored.txId).toEqual(tx.txId);
      expect(restored.getActualTxId()).toEqual(getBchActualTxId(signed()));
      expect(restored.isSigned()).toEqual(true);
      expect(restored.prevouts).toEqual(tx.prevouts);
    });

    /**
     * @target BitcoinCashTransaction.fromJson - rejects envelope %s
     * @dependencies Canonical envelope with
     * network/ID/type/value/index/key/duplicate/whitespace/size faults
     * @scenario Alter one serialized envelope field or canonical JSON property
     * per vector.
     * @expected Reject every malformed or noncanonical envelope.
     */
    it.each([
      'network',
      'approval id',
      'event type',
      'numeric value',
      'unsafe number',
      'extra key',
      'missing key',
      'duplicate key',
      'whitespace',
      'oversized',
    ])('rejects envelope %s', (fault) => {
      const original = envelope().toJson();
      const obj = JSON.parse(original);
      if (fault === 'network') obj.network = 'bitcoin';
      if (fault === 'approval id') obj.txId = '00'.repeat(32);
      if (fault === 'event type') obj.txType = 'unknown';
      if (fault === 'numeric value') obj.prevouts[0].value = 50000;
      if (fault === 'unsafe number')
        obj.prevouts[0].index = Number.MAX_SAFE_INTEGER + 1;
      if (fault === 'extra key') obj.signed = true;
      if (fault === 'missing key') delete obj.publicKey;
      let json = JSON.stringify(obj);
      if (fault === 'duplicate key')
        json = original.replace('{', '{"network":"bitcoin",');
      if (fault === 'whitespace') json = ` ${original}`;
      if (fault === 'oversized')
        json = ' '.repeat(BCH_MAX_ENVELOPE_CHARACTERS + 1);
      expect(() => BitcoinCashTransaction.fromJson(json)).toThrow();
    });
  });
});
