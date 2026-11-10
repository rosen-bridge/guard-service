import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';
import { createHash } from 'node:crypto';

import { TransactionType } from '@rosen-chains/abstract-chain';

import BitcoinCashTransaction from '../lib/bitcoinCashTransaction';
import {
  bchP2pkhScriptFromPublicKey,
  buildBchSignedTransaction,
  decodeBchTransaction,
  getBchActualTxId,
  getBchApprovalTxId,
  getBchOutpointId,
  getBchSigningDigest,
  getBchSigningPreimage,
  isSameBchTransactionBody,
  validateBchNativeTransaction,
  verifyBchSignedTransaction,
} from '../lib/bitcoinCashUtils';
import {
  BCH_MAX_ENVELOPE_CHARACTERS,
  BCH_MAX_INPUTS,
  BCH_MAX_MONEY,
  BCH_MAX_OUTPUTS,
  BCH_MAX_TRANSACTION_BYTES,
} from '../lib/constants';
import { BitcoinCashRawTransaction } from '../lib/types';
import {
  approvalId,
  firstDigest,
  firstPreimage,
  parentHex,
  parentId,
  publicKey,
  treasuryScript,
} from './bitcoinCashTestData';
import { mutate, digest, signatures, signed } from './bitcoinCashTestUtils';
import { prevouts, unsigned } from './bitcoinCashTestUtils';

describe('bitcoinCashUtils', () => {
  describe('getBchSigningPreimage', () => {
    /**
     * @target bitcoinCashUtils.getBchSigningPreimage - matches a fixed
     * independent ForkID preimage and double-SHA256 vector
     * @dependencies Independently serialized parent/unsigned/preimage/digest
     * vectors and node:crypto
     * @scenario Compute parent/script/approval identities, input-zero preimage
     * and both input digests.
     * @expected Match the fixed input-zero vector and independent double
     * SHA256; input one has a distinct digest.
     */
    it('matches a fixed independent ForkID preimage and double-SHA256 vector', () => {
      expect(hashTransaction(hexToBin(parentHex))).toEqual(parentId);
      expect(bchP2pkhScriptFromPublicKey(publicKey)).toEqual(treasuryScript);
      expect(getBchApprovalTxId(unsigned())).toEqual(approvalId);
      expect(
        binToHex(
          getBchSigningPreimage(unsigned(), prevouts(), treasuryScript, 0),
        ),
      ).toEqual(firstPreimage);
      expect(binToHex(digest(0))).toEqual(firstDigest);
      const independent = createHash('sha256')
        .update(
          createHash('sha256')
            .update(Buffer.from(firstPreimage, 'hex'))
            .digest(),
        )
        .digest('hex');
      expect(independent).toEqual(firstDigest);
      expect(binToHex(digest(1))).not.toEqual(firstDigest);
    });
  });

  describe('buildBchSignedTransaction', () => {
    /**
     * @target bitcoinCashUtils.buildBchSignedTransaction - builds minimal
     * ECDSA P2PKH witnesses and preserves the approved body
     * @dependencies Fixed unsigned vector, ordered prevouts and synthetic
     * secp256k1 signatures
     * @scenario Finalize both inputs with valid native P2PKH witnesses.
     * @expected Verify signatures, preserve the approval body/ID, produce a
     * distinct signed hash and keep witnesses at most 108 bytes.
     */
    it('builds minimal ECDSA P2PKH witnesses and preserves the approved body', () => {
      const raw = signed();
      expect(verifyBchSignedTransaction(raw, prevouts(), publicKey)).toEqual(
        true,
      );
      expect(isSameBchTransactionBody(unsigned(), raw)).toEqual(true);
      expect(getBchApprovalTxId(raw)).toEqual(approvalId);
      expect(getBchActualTxId(raw)).not.toEqual(approvalId);
      expect(
        decodeBchTransaction(raw).inputs.every(
          (input) => input.unlockingBytecode.length <= 108,
        ),
      ).toEqual(true);
    });

    /**
     * @target bitcoinCashUtils.buildBchSignedTransaction - rejects %s before
     * finalization
     * @dependencies Synthetic signatures with wrong
     * key/digest/high-S/short/count faults
     * @scenario Attempt finalization using each invalid key or signature
     * vector.
     * @expected Reject before producing signed transaction bytes.
     */
    it.each([
      'wrong key',
      'wrong digest',
      'high S',
      'short signature',
      'wrong signature count',
    ])('rejects %s before finalization', (fault) => {
      const values = signatures();
      let pk = publicKey;
      if (fault === 'wrong key')
        pk =
          '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
      if (fault === 'wrong digest') values[0] = values[1];
      if (fault === 'high S') {
        const result = secp256k1.malleateSignatureCompact(hexToBin(values[0]));
        if (typeof result === 'string') throw Error(result);
        values[0] = binToHex(result);
      }
      if (fault === 'short signature') values[0] = '01';
      if (fault === 'wrong signature count') values.pop();
      expect(() =>
        buildBchSignedTransaction(unsigned(), prevouts(), pk, values),
      ).toThrow();
    });

    /**
     * @target bitcoinCashUtils.buildBchSignedTransaction - rejects a second
     * signing pass and invalid input index
     * @dependencies Valid signed vector and input-index -1/2 digest requests
     * @scenario Attempt signing already signed bytes and requesting a digest
     * outside the two-input range.
     * @expected Reject the second signing pass and both invalid input indices.
     */
    it('rejects a second signing pass and invalid input index', () => {
      expect(() =>
        buildBchSignedTransaction(
          signed(),
          prevouts(),
          publicKey,
          signatures(),
        ),
      ).toThrow('unsigned');
      expect(() =>
        getBchSigningDigest(unsigned(), prevouts(), treasuryScript, -1),
      ).toThrow();
      expect(() =>
        getBchSigningDigest(unsigned(), prevouts(), treasuryScript, 2),
      ).toThrow();
    });
  });

  describe('getBchSigningDigest', () => {
    /**
     * @target bitcoinCashUtils.getBchSigningDigest - rejects isolated %s
     * before constructing a digest
     * @dependencies mutate helper with one transaction-policy fault per vector
     * @scenario Fault version, empty/cardinality/order/outpoint fields, output
     * value/token/script size or fee policy.
     * @expected Reject every invalid body before returning a signing digest.
     */
    it.each([
      [
        'unsupported version',
        (tx: BitcoinCashRawTransaction) => {
          tx.version = 3;
        },
      ],
      [
        'empty inputs',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs = [];
        },
      ],
      [
        'empty outputs',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs = [];
        },
      ],
      [
        'duplicate input',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs[1] = structuredClone(tx.inputs[0]);
        },
      ],
      [
        'reordered inputs',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs.reverse();
        },
      ],
      [
        'wrong outpoint index',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs[0].outpointIndex = 2;
        },
      ],
      [
        'wrong outpoint hash',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs[0].outpointTransactionHash[0] ^= 1;
        },
      ],
      [
        'zero output',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].valueSatoshis = 0n;
        },
      ],
      [
        'excess value',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].valueSatoshis = BCH_MAX_MONEY + 1n;
        },
      ],
      [
        'zero fee',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].valueSatoshis = 90_000n;
        },
      ],
      [
        'negative fee',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].valueSatoshis = 90_001n;
        },
      ],
      [
        'token output',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].token = {
            category: hexToBin('22'.repeat(32)),
            amount: 1n,
          };
        },
      ],
      [
        'oversized output script',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs[0].lockingBytecode = new Uint8Array(10_001);
        },
      ],
      [
        'input count bound',
        (tx: BitcoinCashRawTransaction) => {
          tx.inputs = Array.from({ length: BCH_MAX_INPUTS + 1 }, () =>
            structuredClone(tx.inputs[0]),
          );
        },
      ],
      [
        'output count bound',
        (tx: BitcoinCashRawTransaction) => {
          tx.outputs = Array.from({ length: BCH_MAX_OUTPUTS + 1 }, () => ({
            ...structuredClone(tx.outputs[0]),
            valueSatoshis: 1n,
          }));
        },
      ],
    ])('rejects isolated %s before constructing a digest', (_name, change) => {
      expect(() =>
        getBchSigningDigest(mutate(change), prevouts(), treasuryScript, 0),
      ).toThrow();
    });

    /**
     * @target bitcoinCashUtils.getBchSigningDigest - authenticates prevout %s
     * @dependencies Fresh ordered prevouts with
     * count/order/value/script/parent-hash/index faults
     * @scenario Alter one supplied parent context field while keeping unsigned
     * bytes fixed.
     * @expected Reject each mismatched or unsafe prevout context.
     */
    it.each([
      'count',
      'order',
      'value',
      'script',
      'parent hash',
      'unsafe index',
    ])('authenticates prevout %s', (field) => {
      const inputs = prevouts();
      if (field === 'count') inputs.pop();
      if (field === 'order') inputs.reverse();
      if (field === 'value') inputs[0].value += 1n;
      if (field === 'script')
        inputs[0].scriptPubKey = treasuryScript.replace('751e', '001e');
      if (field === 'parent hash')
        inputs[0].parentTransactionHex = parentHex.slice(0, -8) + '01000000';
      if (field === 'unsafe index')
        inputs[0].index = Number.MAX_SAFE_INTEGER + 1;
      expect(() =>
        getBchSigningDigest(unsigned(), inputs, treasuryScript, 0),
      ).toThrow();
    });

    /**
     * @target bitcoinCashUtils.getBchSigningDigest - isolates the input limit
     * with unique fully authenticated prevouts
     * @dependencies Distinct outputs of an encoded parent and BCH_MAX_INPUTS+1
     * unique inputs
     * @scenario Exceed input cardinality while keeping every outpoint, value
     * and parent context valid.
     * @expected Reject specifically for transaction cardinality limit.
     */
    it('isolates the input limit with unique fully authenticated prevouts', () => {
      const count = BCH_MAX_INPUTS + 1;
      const parent = decodeBchTransaction(hexToBin(parentHex));
      parent.outputs = Array.from({ length: count }, () => ({
        ...structuredClone(parent.outputs[0]),
        valueSatoshis: 1_000n,
      }));
      const parentBytes = encodeTransactionBCH(parent);
      const txId = hashTransaction(parentBytes);
      const parentTransactionHex = binToHex(parentBytes);
      const tx = decodeBchTransaction(unsigned());
      tx.inputs = Array.from({ length: count }, (_, index) => ({
        ...structuredClone(tx.inputs[0]),
        outpointTransactionHash: hexToBin(txId),
        outpointIndex: index,
      }));
      tx.outputs[0].valueSatoshis = BigInt(count) * 1_000n - 1_000n;
      const inputs = Array.from({ length: count }, (_, index) => ({
        txId,
        index,
        value: 1_000n,
        scriptPubKey: treasuryScript,
        parentTransactionHex,
      }));
      expect(() =>
        getBchSigningDigest(
          encodeTransactionBCH(tx),
          inputs,
          treasuryScript,
          0,
        ),
      ).toThrow('Transaction cardinality limit exceeded');
    });

    /**
     * @target bitcoinCashUtils.getBchSigningDigest - authenticates the parent
     * script independently of treasury metadata
     * @dependencies Reencoded parent with altered locking script and updated
     * parent/outpoint identities
     * @scenario Keep treasury metadata unchanged while changing the parent
     * output script itself.
     * @expected Reject authenticated prevout mismatch.
     */
    it('authenticates the parent script independently of treasury metadata', () => {
      const parent = decodeBchTransaction(hexToBin(parentHex));
      parent.outputs[0].lockingBytecode[3] ^= 1;
      const parentBytes = encodeTransactionBCH(parent);
      const txId = hashTransaction(parentBytes);
      const inputs = prevouts().map((input) => ({
        ...input,
        txId,
        parentTransactionHex: binToHex(parentBytes),
      }));
      const tx = decodeBchTransaction(unsigned());
      tx.inputs.forEach((input) => {
        input.outpointTransactionHash = hexToBin(txId);
      });
      expect(() =>
        getBchSigningDigest(
          encodeTransactionBCH(tx),
          inputs,
          treasuryScript,
          0,
        ),
      ).toThrow('Authenticated prevout mismatch');
    });

    /**
     * @target bitcoinCashUtils.getBchSigningDigest - rejects an authenticated
     * parent lacking the exact requested output
     * @dependencies Fixed parent context and an unsigned outpoint requesting
     * index 99
     * @scenario Supply consistent requested indices whose retained parent has
     * no corresponding output.
     * @expected Reject with Parent output missing.
     */
    it('rejects an authenticated parent lacking the exact requested output', () => {
      const inputs = prevouts();
      inputs[0].index = 99;
      const raw = mutate((tx) => {
        tx.inputs[0].outpointIndex = 99;
      });
      expect(() => getBchSigningDigest(raw, inputs, treasuryScript, 0)).toThrow(
        'Parent output missing',
      );
    });

    /**
     * @target bitcoinCashUtils.getBchSigningDigest - bounds combined parent
     * context before decoding parents
     * @dependencies Prevout with parent hex at BCH_MAX_ENVELOPE_CHARACTERS/2
     * bytes
     * @scenario Exceed combined context bounds without changing the approved
     * unsigned body.
     * @expected Reject specifically for the combined transaction context
     * limit.
     */
    it('bounds combined parent context before decoding parents', () => {
      const inputs = prevouts();
      inputs[0].parentTransactionHex = '00'.repeat(
        BCH_MAX_ENVELOPE_CHARACTERS / 2,
      );
      expect(() =>
        getBchSigningDigest(unsigned(), inputs, treasuryScript, 0),
      ).toThrow('Combined transaction context limit');
    });
  });

  describe('validateBchNativeTransaction', () => {
    /**
     * @target bitcoinCashUtils.validateBchNativeTransaction - rejects a real
     * token prevout even when the legacy P2PKH script matches
     * @dependencies Canonical CashToken parent bytes with updated parent
     * hashes/outpoints
     * @scenario Attach a real token to a parent output while retaining its
     * legacy treasury locking script.
     * @expected Reject CashTokens inputs.
     */
    it('rejects a real token prevout even when the legacy P2PKH script matches', () => {
      const parent = decodeBchTransaction(hexToBin(parentHex));
      parent.outputs[0].token = {
        category: hexToBin('22'.repeat(32)),
        amount: 1n,
      };
      const parentBytes = encodeTransactionBCH(parent);
      const inputs = prevouts();
      inputs.forEach((input) => {
        input.txId = hashTransaction(parentBytes);
        input.parentTransactionHex = binToHex(parentBytes);
      });
      const raw = mutate((tx) =>
        tx.inputs.forEach((input) => {
          input.outpointTransactionHash = hexToBin(inputs[0].txId);
        }),
      );
      expect(() =>
        validateBchNativeTransaction(raw, inputs, treasuryScript),
      ).toThrow('CashTokens inputs');
    });
  });

  describe('decodeBchTransaction', () => {
    /**
     * @target bitcoinCashUtils.decodeBchTransaction - rejects parser %s
     * @dependencies Fixed unsigned bytes and
     * trailing/truncated/nonminimal/token-prefix/size vectors
     * @scenario Supply each malformed or over-limit serialization
     * independently.
     * @expected Reject every noncanonical or oversized transaction.
     */
    it.each([
      'trailing bytes',
      'truncated bytes',
      'nonminimal count',
      'malformed token prefix',
      'size bound',
    ])('rejects parser %s', (fault) => {
      let bytes = unsigned();
      if (fault === 'trailing bytes') bytes = Uint8Array.from([...bytes, 0]);
      if (fault === 'truncated bytes') bytes = bytes.slice(0, -1);
      if (fault === 'nonminimal count')
        bytes = Uint8Array.from([
          ...bytes.slice(0, 4),
          0xfd,
          2,
          0,
          ...bytes.slice(5),
        ]);
      if (fault === 'malformed token prefix')
        bytes = mutate((tx) => {
          tx.outputs[0].lockingBytecode = Uint8Array.of(0xef);
        });
      if (fault === 'size bound')
        bytes = new Uint8Array(BCH_MAX_TRANSACTION_BYTES + 1);
      expect(() => decodeBchTransaction(bytes)).toThrow();
    });
  });

  describe('isSameBchTransactionBody', () => {
    /**
     * @target bitcoinCashUtils.isSameBchTransactionBody - recovery rejects
     * isolated body %s
     * @dependencies mutate helper over the fixed unsigned vector
     * @scenario Individually alter locktime, sequence, version, output
     * script/value/count, input count or input order.
     * @expected Return false for each changed approval body.
     */
    it.each([
      'locktime',
      'sequence',
      'version',
      'output script',
      'output value',
      'extra output',
      'extra input',
      'input order',
    ])('recovery rejects isolated body %s', (field) => {
      const changed = mutate((tx) => {
        if (field === 'locktime') tx.locktime = 1;
        if (field === 'sequence') tx.inputs[0].sequenceNumber--;
        if (field === 'version') tx.version = 1;
        if (field === 'output script') tx.outputs[0].lockingBytecode[3] ^= 1;
        if (field === 'output value') tx.outputs[0].valueSatoshis--;
        if (field === 'extra output')
          tx.outputs.push(structuredClone(tx.outputs[0]));
        if (field === 'extra input')
          tx.inputs.push(structuredClone(tx.inputs[0]));
        if (field === 'input order') tx.inputs.reverse();
      });
      expect(isSameBchTransactionBody(unsigned(), changed)).toEqual(false);
    });

    /**
     * @target bitcoinCashUtils.isSameBchTransactionBody - recovery rejects
     * output reordering with unchanged output cardinality
     * @dependencies Two distinct native outputs and their reversed ordered
     * serialization
     * @scenario Reverse outputs without changing their count or individual
     * fields.
     * @expected Return false for the ordered-body mismatch.
     */
    it('recovery rejects output reordering with unchanged output cardinality', () => {
      const expected = mutate((tx) => {
        tx.outputs[0].valueSatoshis = 88_000n;
        tx.outputs.push({
          ...structuredClone(tx.outputs[0]),
          valueSatoshis: 1_000n,
        });
      });
      const tx = decodeBchTransaction(expected);
      tx.outputs.reverse();
      expect(
        isSameBchTransactionBody(expected, encodeTransactionBCH(tx)),
      ).toEqual(false);
    });
  });

  describe('verifyBchSignedTransaction', () => {
    /**
     * @target bitcoinCashUtils.verifyBchSignedTransaction - rejects signed %s
     * @dependencies Valid signed bytes with isolated
     * sighash/push/witness/DER/key faults
     * @scenario Alter one witness property while retaining the parent and
     * treasury key context.
     * @expected Return false for every invalid signed witness.
     */
    it.each([
      'wrong sighash',
      'nonminimal push',
      'partial witness',
      'corrupt DER',
      'wrong witness pubkey',
    ])('rejects signed %s', (fault) => {
      const tx = decodeBchTransaction(signed());
      const witness = tx.inputs[0].unlockingBytecode;
      if (fault === 'wrong sighash') witness[witness[0]] = 1;
      if (fault === 'nonminimal push')
        tx.inputs[0].unlockingBytecode = Uint8Array.from([0x4c, ...witness]);
      if (fault === 'partial witness')
        tx.inputs[1].unlockingBytecode = new Uint8Array();
      if (fault === 'corrupt DER') witness[1] = 0;
      if (fault === 'wrong witness pubkey') witness[witness.length - 1] ^= 1;
      expect(
        verifyBchSignedTransaction(
          encodeTransactionBCH(tx),
          prevouts(),
          publicKey,
        ),
      ).toEqual(false);
    });

    /**
     * @target bitcoinCashUtils.verifyBchSignedTransaction - rejects a
     * canonical DER signed witness with %s
     * @dependencies Invalid-scalar or high-S compact signatures round-tripped
     * through DER
     * @scenario Encode canonical DER bytes that fail signature scalar/digest
     * or low-S validation.
     * @expected Return false and reject envelope construction as invalid or
     * partially signed.
     */
    it.each(['invalid scalar', 'high S'])(
      'rejects a canonical DER signed witness with %s',
      (fault) => {
        let compact = hexToBin(signatures()[0]);
        if (fault === 'invalid scalar') compact[31] ^= 1;
        else {
          const malleated = secp256k1.malleateSignatureCompact(compact);
          if (typeof malleated === 'string') throw Error(malleated);
          compact = malleated;
        }
        const der = secp256k1.signatureCompactToDER(compact);
        if (typeof der === 'string') throw Error(der);
        const roundTrip = secp256k1.signatureDERToCompact(der);
        if (typeof roundTrip === 'string') throw Error(roundTrip);
        expect(binToHex(roundTrip)).toEqual(binToHex(compact));
        const tx = decodeBchTransaction(signed());
        tx.inputs[0].unlockingBytecode = Uint8Array.from([
          der.length + 1,
          ...der,
          0x41,
          33,
          ...hexToBin(publicKey),
        ]);
        const bytes = encodeTransactionBCH(tx);
        expect(
          verifyBchSignedTransaction(bytes, prevouts(), publicKey),
        ).toEqual(false);
        expect(
          () =>
            new BitcoinCashTransaction(
              'invalid-witness',
              bytes,
              TransactionType.payment,
              prevouts(),
              publicKey,
            ),
        ).toThrow('Invalid or partially signed transaction');
      },
    );
  });

  describe('getBchOutpointId', () => {
    /**
     * @target bitcoinCashUtils.getBchOutpointId - outpoint helpers never
     * mutate hashes and validation accepts the untouched source
     * @dependencies Fixed parent ID, fresh unsigned bytes and valid ordered
     * context
     * @scenario Build an outpoint ID and repeatedly compute approval identity
     * on the same bytes.
     * @expected Return hash.0, preserve exact source bytes and accept
     * untouched native validation.
     */
    it('outpoint helpers never mutate hashes and validation accepts the untouched source', () => {
      const bytes = unsigned();
      expect(getBchOutpointId(parentId, 0)).toEqual(`${parentId}.0`);
      getBchApprovalTxId(bytes);
      getBchApprovalTxId(bytes);
      expect(binToHex(bytes)).toEqual(binToHex(unsigned()));
      expect(() =>
        validateBchNativeTransaction(bytes, prevouts(), treasuryScript),
      ).not.toThrow();
    });
  });
});
