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
  prevouts,
  privateKey,
  publicKey,
  treasuryScript,
  unsigned,
} from './fixtures';

const mutate = (change: (tx: BitcoinCashRawTransaction) => void) => {
  const tx = decodeBchTransaction(unsigned());
  change(tx);
  return encodeTransactionBCH(tx);
};
const digest = (index: number) =>
  getBchSigningDigest(unsigned(), prevouts(), treasuryScript, index);
const signatures = () =>
  [0, 1].map((index) => {
    const result = secp256k1.signMessageHashCompact(privateKey, digest(index));
    if (typeof result === 'string') throw Error(result);
    return binToHex(result);
  });
const signed = () =>
  buildBchSignedTransaction(unsigned(), prevouts(), publicKey, signatures());
const envelope = () =>
  new BitcoinCashTransaction(
    'test-event',
    unsigned(),
    TransactionType.payment,
    prevouts(),
    publicKey,
  );

describe('native BCH transaction contract', () => {
  it('matches a fixed independent ForkID preimage and double-SHA256 vector', () => {
    expect(hashTransaction(hexToBin(parentHex))).toBe(parentId);
    expect(bchP2pkhScriptFromPublicKey(publicKey)).toBe(treasuryScript);
    expect(getBchApprovalTxId(unsigned())).toBe(approvalId);
    expect(
      binToHex(
        getBchSigningPreimage(unsigned(), prevouts(), treasuryScript, 0),
      ),
    ).toBe(firstPreimage);
    expect(binToHex(digest(0))).toBe(firstDigest);
    const independent = createHash('sha256')
      .update(
        createHash('sha256').update(Buffer.from(firstPreimage, 'hex')).digest(),
      )
      .digest('hex');
    expect(independent).toBe(firstDigest);
    expect(binToHex(digest(1))).not.toBe(firstDigest);
  });

  it('builds minimal ECDSA P2PKH witnesses and preserves the approved body', () => {
    const raw = signed();
    expect(verifyBchSignedTransaction(raw, prevouts(), publicKey)).toBe(true);
    expect(isSameBchTransactionBody(unsigned(), raw)).toBe(true);
    expect(getBchApprovalTxId(raw)).toBe(approvalId);
    expect(getBchActualTxId(raw)).not.toBe(approvalId);
    expect(
      decodeBchTransaction(raw).inputs.every(
        (input) => input.unlockingBytecode.length <= 108,
      ),
    ).toBe(true);
  });

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

  it.each(['count', 'order', 'value', 'script', 'parent hash', 'unsafe index'])(
    'authenticates prevout %s',
    (field) => {
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
    },
  );

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
      getBchSigningDigest(encodeTransactionBCH(tx), inputs, treasuryScript, 0),
    ).toThrow('Transaction cardinality limit exceeded');
  });

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
      getBchSigningDigest(encodeTransactionBCH(tx), inputs, treasuryScript, 0),
    ).toThrow('Authenticated prevout mismatch');
  });

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

  it('bounds combined parent context before decoding parents', () => {
    const inputs = prevouts();
    inputs[0].parentTransactionHex = '00'.repeat(
      BCH_MAX_ENVELOPE_CHARACTERS / 2,
    );
    expect(() =>
      getBchSigningDigest(unsigned(), inputs, treasuryScript, 0),
    ).toThrow('Combined transaction context limit');
  });

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
    expect(isSameBchTransactionBody(unsigned(), changed)).toBe(false);
  });

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
    expect(isSameBchTransactionBody(expected, encodeTransactionBCH(tx))).toBe(
      false,
    );
  });

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
      pk = '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
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
    ).toBe(false);
  });

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
      expect(binToHex(roundTrip)).toBe(binToHex(compact));
      const tx = decodeBchTransaction(signed());
      tx.inputs[0].unlockingBytecode = Uint8Array.from([
        der.length + 1,
        ...der,
        0x41,
        33,
        ...hexToBin(publicKey),
      ]);
      const bytes = encodeTransactionBCH(tx);
      expect(verifyBchSignedTransaction(bytes, prevouts(), publicKey)).toBe(
        false,
      );
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

  it('rejects a second signing pass and invalid input index', () => {
    expect(() =>
      buildBchSignedTransaction(signed(), prevouts(), publicKey, signatures()),
    ).toThrow('unsigned');
    expect(() =>
      getBchSigningDigest(unsigned(), prevouts(), treasuryScript, -1),
    ).toThrow();
    expect(() =>
      getBchSigningDigest(unsigned(), prevouts(), treasuryScript, 2),
    ).toThrow();
  });

  it('outpoint helpers never mutate hashes and validation accepts the untouched source', () => {
    const bytes = unsigned();
    expect(getBchOutpointId(parentId, 0)).toBe(`${parentId}.0`);
    getBchApprovalTxId(bytes);
    getBchApprovalTxId(bytes);
    expect(binToHex(bytes)).toBe(binToHex(unsigned()));
    expect(() =>
      validateBchNativeTransaction(bytes, prevouts(), treasuryScript),
    ).not.toThrow();
  });
});

describe('BCH transaction envelope custody', () => {
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
      expect(buffered.toString('hex')).toBe(originalHex);
      expect(getBchApprovalTxId(buffered)).toBe(expectedApproval);
      expect(getBchActualTxId(buffered)).toBe(expectedActual);
      [0, 1].forEach((index) => {
        expect(
          binToHex(
            getBchSigningDigest(buffered, inputs, treasuryScript, index),
          ),
        ).toBe(binToHex(expectedDigests[index]));
      });
      expect(buffered.toString('hex')).toBe(originalHex);
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
    expect(envelopeFromBuffer.txId).toBe(expectedApproval);
    expect(envelopeFromBuffer.getActualTxId()).toBe(
      getBchActualTxId(expectedSigned),
    );
    expect(restored.toJson()).toBe(envelopeFromBuffer.toJson());
    expect(restored.isSigned()).toBe(true);
    expect(restored.getActualTxId()).toBe(envelopeFromBuffer.getActualTxId());
    expect(signedBuffer.toString('hex')).toBe(signedHex);
  });

  it('restores exact unsigned and signed state from canonical JSON', () => {
    const tx = envelope();
    expect(tx.isSigned()).toBe(false);
    expect(tx.getActualTxId()).toBeUndefined();
    expect(BitcoinCashTransaction.fromJson(tx.toJson()).toJson()).toBe(
      tx.toJson(),
    );
    const result = tx.withSignatures(signatures());
    const restored = BitcoinCashTransaction.fromJson(result.toJson());
    expect(restored.toJson()).toBe(result.toJson());
    expect(restored.txId).toBe(tx.txId);
    expect(restored.getActualTxId()).toBe(getBchActualTxId(signed()));
    expect(restored.isSigned()).toBe(true);
    expect(restored.prevouts).toEqual(tx.prevouts);
  });

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
    expect(tx.txId).toBe(approvalId);
    expect(() => tx.toJson()).not.toThrow();
    tx.txBytes[0] = 3;
    expect(() => tx.toJson()).toThrow();
  });
});
