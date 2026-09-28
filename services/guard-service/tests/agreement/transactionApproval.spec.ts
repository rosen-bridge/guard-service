import { describe, expect, it } from 'vitest';

import { Communicator } from '@rosen-bridge/communication';
import { ECDSA } from '@rosen-bridge/encryption';

import {
  assertApprovalBinding,
  calculateApprovalHash,
  createTransactionApproval,
  decodeTransactionApproval,
  verifyTransactionApproval,
} from '../../src/agreement/transactionApproval';

type MutationRecord = ReturnType<typeof decodeTransactionApproval> & {
  extra?: boolean;
};

// Deterministic synthetic identities; never used with live funds or services.
const signers = [1, 2, 3, 4].map(
  (index) => new ECDSA(index.toString(16).padStart(64, '0')),
);
const txJson = JSON.stringify({
  network: 'zcash',
  txId: 'aa'.repeat(32),
  eventId: 'bb'.repeat(32),
  txBytes: 'abcd',
  txType: 'payment',
});
const fixture = async () => {
  const policy = {
    protocolVersion: '1.0.0' as const,
    guardPublicKeys: await Promise.all(signers.map((signer) => signer.getPk())),
    requiredSign: 3,
  };
  const timestamp = 1_700_000_000;
  const txDataHash = calculateApprovalHash(txJson);
  const signatures = await Promise.all(
    signers.map((signer, index) =>
      signer.sign(
        Communicator.generatePayloadToSign(
          { txDataHash },
          timestamp,
          policy.guardPublicKeys[index],
          '1.0.0',
        ),
      ),
    ),
  );
  signatures[3] = '';
  const encoded = createTransactionApproval(
    txJson,
    timestamp,
    signatures,
    policy,
  );
  return { policy, timestamp, signatures, encoded };
};

describe('durable transaction approval', () => {
  it('replays real indexed ECDSA signatures against independently supplied policy', async () => {
    const { encoded, policy } = await fixture();
    const approval = await verifyTransactionApproval(
      encoded,
      policy,
      signers[0],
    );
    expect(approval.approvedTxJson).toBe(txJson);
    expect(approval.requiredSign).toBe(3);
    expect(Object.isFrozen(approval)).toBe(true);
    expect(Object.isFrozen(approval.signatures)).toBe(true);
    expect(() => assertApprovalBinding(approval, txJson, 3)).not.toThrow();
    expect(() => assertApprovalBinding(approval, txJson, 2)).toThrow();
    expect(() =>
      assertApprovalBinding(approval, txJson.replace('bb', 'cc'), 3),
    ).toThrow();
  });

  it.each([
    'approvedTxJson',
    'txDataHash',
    'timestamp',
    'protocolVersion',
    'guardPublicKeys',
    'signatures',
    'requiredSign',
    'schema',
  ])('rejects tampering with %s', async (field) => {
    const { encoded, policy } = await fixture();
    const changed = JSON.parse(encoded);
    switch (field) {
      case 'approvedTxJson':
        changed.approvedTxJson = txJson.replace('bb', 'cc');
        break;
      case 'txDataHash':
        changed.txDataHash = '00'.repeat(32);
        break;
      case 'timestamp':
        changed.timestamp += 1;
        break;
      case 'protocolVersion':
        changed.protocolVersion = '1.0.1';
        break;
      case 'guardPublicKeys':
        changed.guardPublicKeys.reverse();
        break;
      case 'signatures':
        changed.signatures[1] = changed.signatures[0];
        break;
      case 'requiredSign':
        changed.requiredSign = 2;
        break;
      case 'schema':
        changed.schema = 2;
        break;
    }
    await expect(
      verifyTransactionApproval(JSON.stringify(changed), policy, signers[0]),
    ).rejects.toThrow();
  });

  it('does not let changed metadata retain authority through the same native txid', async () => {
    const { encoded, policy } = await fixture();
    const changed = JSON.parse(encoded);
    changed.approvedTxJson = txJson.replace('bb', 'cc');
    changed.txDataHash = calculateApprovalHash(changed.approvedTxJson);
    await expect(
      verifyTransactionApproval(JSON.stringify(changed), policy, signers[0]),
    ).rejects.toThrow();
  });

  it('does not let a self-declared lower threshold or new membership authorize itself', async () => {
    const { encoded, policy } = await fixture();
    const changed = JSON.parse(encoded);
    changed.requiredSign = 1;
    changed.signatures = [changed.signatures[0], '', '', ''];
    await expect(
      verifyTransactionApproval(JSON.stringify(changed), policy, signers[0]),
    ).rejects.toThrow();
    await expect(
      verifyTransactionApproval(
        encoded,
        { ...policy, guardPublicKeys: [...policy.guardPublicKeys].reverse() },
        signers[0],
      ),
    ).rejects.toThrow();
  });

  it.each([
    [
      'duplicate members',
      (x: MutationRecord) => {
        x.guardPublicKeys[1] = x.guardPublicKeys[0];
      },
    ],
    [
      'missing indexed signature',
      (x: MutationRecord) => {
        x.signatures.pop();
      },
    ],
    [
      'additional indexed signature',
      (x: MutationRecord) => {
        x.signatures.push('');
      },
    ],
    [
      'malformed key',
      (x: MutationRecord) => {
        x.guardPublicKeys[0] = 'ab'.repeat(32);
      },
    ],
    [
      'malformed signature',
      (x: MutationRecord) => {
        x.signatures[0] = 'ab';
      },
    ],
    [
      'negative time',
      (x: MutationRecord) => {
        x.timestamp = -1;
      },
    ],
    [
      'fractional time',
      (x: MutationRecord) => {
        x.timestamp = 1.5;
      },
    ],
    [
      'unsafe time',
      (x: MutationRecord) => {
        x.timestamp = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      'zero threshold',
      (x: MutationRecord) => {
        x.requiredSign = 0;
      },
    ],
    [
      'excess threshold',
      (x: MutationRecord) => {
        x.requiredSign = 5;
      },
    ],
    [
      'fractional threshold',
      (x: MutationRecord) => {
        x.requiredSign = 1.5;
      },
    ],
    [
      'unknown field',
      (x: MutationRecord) => {
        x.extra = true;
      },
    ],
    [
      'insufficient signatures',
      (x: MutationRecord) => {
        x.signatures[1] = '';
      },
    ],
  ])('rejects malformed record: %s', async (_name, mutate) => {
    const { encoded } = await fixture();
    const changed = JSON.parse(encoded);
    mutate(changed);
    expect(() => decodeTransactionApproval(JSON.stringify(changed))).toThrow();
  });

  it('rejects noncanonical encodings, duplicate fields and oversized records', async () => {
    const { encoded } = await fixture();
    for (const changed of [
      ' ' + encoded,
      encoded.replace('"schema":1', '"schema":1,"schema":1'),
      'x'.repeat(17 * 1024 * 1024 + 1),
    ])
      expect(() => decodeTransactionApproval(changed)).toThrow();
  });

  it('copies the proposal and policy before any verification await', async () => {
    const { encoded, policy } = await fixture();
    let calls = 0;
    const verification = verifyTransactionApproval(encoded, policy, {
      verify: async (...args) => {
        calls++;
        policy.guardPublicKeys.reverse();
        policy.requiredSign = 1;
        return signers[0].verify(...args);
      },
    });
    const approval = await verification;
    expect(calls).toBe(3);
    expect(approval.requiredSign).toBe(3);
    expect(approval.guardPublicKeys[0]).toBe(await signers[0].getPk());
  });

  it('requires every present signature to verify even after reaching threshold', async () => {
    const { encoded, policy } = await fixture();
    const changed = JSON.parse(encoded);
    changed.signatures[3] = changed.signatures[0];
    await expect(
      verifyTransactionApproval(JSON.stringify(changed), policy, signers[0]),
    ).rejects.toThrow();
  });

  it('copies producer arrays and rejects sparse signatures before persistence', async () => {
    const { encoded, policy, timestamp, signatures } = await fixture();
    signatures[0] = '';
    policy.guardPublicKeys.reverse();
    expect(decodeTransactionApproval(encoded).signatures[0]).not.toBe('');
    const valid = await fixture();
    delete valid.signatures[1];
    expect(() =>
      createTransactionApproval(
        txJson,
        timestamp,
        valid.signatures,
        valid.policy,
      ),
    ).toThrow();
  });
});
