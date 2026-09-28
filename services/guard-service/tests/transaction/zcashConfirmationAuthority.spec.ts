import { createHash } from 'node:crypto';

import type { PaymentOrder } from '@rosen-chains/abstract-chain';
import type { ZcashTransactionObservation } from '@rosen-chains/zcash';

import { createTransactionApproval } from '../../src/agreement/transactionApproval';
import {
  assertZcashConfirmedPayment,
  decodeZcashSettlementReceipt,
  encodeZcashSettlementReceipt,
  ZcashConfirmationAuthority,
  type ZcashConfirmationPolicy,
  type ZcashConfirmationSource,
  type ZcashSettlementReceipt,
} from '../../src/transaction/zcashConfirmationAuthority';
import {
  encodeZcashSigningBinding,
  type ZcashSigningBinding,
} from '../../src/transaction/zcashSigningContext';

const txId = '11'.repeat(32);
const eventId = '22'.repeat(32);
const genesisHash = '33'.repeat(32);
const blockHash = '44'.repeat(32);
const signedHex = 'deadbeef';
const attemptId = '12345678-1234-4123-8123-123456789abc';
const address = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';

const outerJson = (bytes: string): string =>
  JSON.stringify({
    eventId,
    network: 'zcash',
    txBytes: Buffer.from(bytes, 'utf8').toString('hex'),
    txId,
    txType: 'payment',
  });

const approvedTxJson = JSON.stringify({
  eventId,
  network: 'zcash',
  txBytes: '00',
  txId,
  txType: 'payment',
});
const signedTxJson = outerJson(
  JSON.stringify({
    schema: 1,
    intent: { network: 'regtest' },
    unsignedTxHex: '00',
    authorization: {
      compactSignatureHex: '55'.repeat(64),
      compressedPubkeyHex: '02' + '66'.repeat(32),
      signedTxHex: signedHex,
    },
  }),
);
const approvalEvidence = createTransactionApproval(
  approvedTxJson,
  1_700_000_000,
  ['77'.repeat(64)],
  {
    protocolVersion: '1.0.0',
    guardPublicKeys: ['02' + '88'.repeat(32)],
    requiredSign: 1,
  },
);

const binding = (
  overrides: Partial<ZcashSigningBinding> = {},
): ZcashSigningBinding => ({
  schema: 1,
  txId,
  eventId,
  approvedTxJson,
  approvalEvidence,
  requiredSign: 1,
  genesisHash,
  outpoint: '99'.repeat(32) + ':0',
  sighashAll: 'aa'.repeat(32),
  tssProfileHash: 'bb'.repeat(32),
  ...overrides,
});

const confirmed = (
  overrides: Partial<
    Extract<ZcashTransactionObservation, { kind: 'confirmed' }>
  > = {},
): ZcashTransactionObservation => ({
  kind: 'confirmed',
  txId,
  hex: signedHex,
  blockHash,
  height: 120,
  confirmations: 3,
  ...overrides,
});

interface Fixture {
  authority: ZcashConfirmationAuthority;
  source: ZcashConfirmationSource & {
    validate: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
    policy: ReturnType<typeof vi.fn>;
  };
  payments: PaymentOrder;
  policy: ZcashConfirmationPolicy;
  setObservation(value: ZcashTransactionObservation): void;
  setPolicy(value: ZcashConfirmationPolicy): void;
  setClock(value: number): void;
  snapshot: {
    txId: string;
    eventId: string;
    attemptId: string;
    signedTxJson: string;
    binding: ZcashSigningBinding;
  };
  context: string;
}

const fixture = (requiredConfirmations = 2): Fixture => {
  let clock = 1_000;
  let currentPolicy: ZcashConfirmationPolicy = {
    network: 'regtest',
    genesisHash,
    sourceId: 'guard-local-fixture',
    requiredConfirmations,
    maximumAgeMs: 5_000,
  };
  let observation = confirmed();
  const payments: PaymentOrder = [
    { address, assets: { nativeToken: 90_000_000n, tokens: [] } },
  ];
  const source = {
    validate: vi.fn((actualBinding: ZcashSigningBinding, json: string) => {
      expect(actualBinding.genesisHash).toBe(currentPolicy.genesisHash);
      expect(json).toBe(signedTxJson);
      return payments;
    }),
    observe: vi.fn(async (json: string) => {
      expect(json).toBe(signedTxJson);
      return observation;
    }),
    policy: vi.fn(() => currentPolicy),
  };
  return {
    authority: new ZcashConfirmationAuthority(source, () => clock),
    source,
    payments,
    policy: currentPolicy,
    setObservation: (value) => {
      observation = value;
    },
    setPolicy: (value) => {
      currentPolicy = value;
    },
    setClock: (value) => {
      clock = value;
    },
    snapshot: { txId, eventId, attemptId, signedTxJson, binding: binding() },
    context: JSON.stringify({ eventId, serialized: 'fixture' }),
  };
};

const capture = async (f: Fixture) => {
  const result = await f.authority.capture(f.snapshot, f.context);
  expect(result).not.toBeNull();
  return result!;
};

const invalidReceiptCases: Array<
  [
    string,
    (receipt: Readonly<ZcashSettlementReceipt>) => ZcashSettlementReceipt,
  ]
> = [
  ['schema', (receipt) => ({ ...receipt, schema: 2 as 1 })],
  ['txId', (receipt) => ({ ...receipt, txId: 'AA'.repeat(32) })],
  ['eventId', (receipt) => ({ ...receipt, eventId: '00' })],
  ['attemptId', (receipt) => ({ ...receipt, attemptId: 'contains space' })],
  ['network', (receipt) => ({ ...receipt, network: 'zcash' as 'regtest' })],
  ['genesisHash', (receipt) => ({ ...receipt, genesisHash: '00' })],
  ['sourceId', (receipt) => ({ ...receipt, sourceId: '' })],
  [
    'signedTxJsonSha256',
    (receipt) => ({ ...receipt, signedTxJsonSha256: '00' }),
  ],
  ['bindingSha256', (receipt) => ({ ...receipt, bindingSha256: '00' })],
  [
    'eventContextJson',
    (receipt) => ({ ...receipt, eventContextJson: '{ "a": 1 }' }),
  ],
  ['blockHash', (receipt) => ({ ...receipt, blockHash: '00' })],
  ['blockHeight negative zero', (receipt) => ({ ...receipt, blockHeight: -0 })],
  ['blockHeight range', (receipt) => ({ ...receipt, blockHeight: -1 })],
  [
    'confirmations threshold',
    (receipt) => ({
      ...receipt,
      confirmations: receipt.requiredConfirmations - 1,
    }),
  ],
  [
    'confirmations range',
    (receipt) => ({ ...receipt, confirmations: 0x1_0000_0000 }),
  ],
  [
    'requiredConfirmations',
    (receipt) => ({ ...receipt, requiredConfirmations: 0 }),
  ],
  [
    'observedAtMs negative zero',
    (receipt) => ({ ...receipt, observedAtMs: -0 }),
  ],
  ['observedAtMs integer', (receipt) => ({ ...receipt, observedAtMs: 1.5 })],
  ['maximumAgeMs', (receipt) => ({ ...receipt, maximumAgeMs: 300_001 })],
];

describe('Zcash confirmation authority', () => {
  it('issues a branded immutable payment and exact canonical receipt', async () => {
    const f = fixture();
    const result = await capture(f);
    const bindingJson = encodeZcashSigningBinding(f.snapshot.binding);
    expect(result.payments).toEqual(f.payments);
    expect(result.receipt).toEqual({
      schema: 1,
      txId,
      eventId,
      attemptId,
      network: 'regtest',
      genesisHash,
      sourceId: 'guard-local-fixture',
      signedTxJsonSha256: createHash('sha256')
        .update(signedTxJson)
        .digest('hex'),
      bindingSha256: createHash('sha256').update(bindingJson).digest('hex'),
      eventContextJson: f.context,
      blockHash,
      blockHeight: 120,
      confirmations: 3,
      requiredConfirmations: 2,
      observedAtMs: 1_000,
      maximumAgeMs: 5_000,
    });
    expect(result.receiptJson).toBe(
      encodeZcashSettlementReceipt(result.receipt),
    );
    expect(decodeZcashSettlementReceipt(result.receiptJson)).toEqual(
      result.receipt,
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(Object.isFrozen(result.payments)).toBe(true);
    expect(Object.isFrozen(result.payments[0])).toBe(true);
    expect(Object.isFrozen(result.payments[0].assets)).toBe(true);
    expect(Object.isFrozen(result.payments[0].assets.tokens)).toBe(true);
    f.payments[0].address = 'caller-mutated';
    expect(result.payments[0].address).toBe(address);
    expect(() => assertZcashConfirmedPayment(result)).not.toThrow();
    expect(() => assertZcashConfirmedPayment({ ...result })).toThrow(
      'unissued payment',
    );
    expect(f.source.validate).toHaveBeenCalledTimes(1);
    expect(f.source.observe).toHaveBeenCalledTimes(1);
  });

  it('accepts the exact durable broadcast snapshot superset', async () => {
    const f = fixture();
    const stored = {
      ...f.snapshot,
      status: 'sent' as const,
      settlementJson: null,
    };
    const unknown = { ...stored, extra: true };
    const partial = { ...f.snapshot, status: 'sent' as const };
    await expect(
      f.authority.capture(stored, f.context),
    ).resolves.not.toBeNull();
    await expect(f.authority.capture(unknown, f.context)).rejects.toThrow(
      'snapshot',
    );
    await expect(f.authority.capture(partial, f.context)).rejects.toThrow(
      'snapshot',
    );
  });

  it('rejects malformed validated payments before observation', async () => {
    const f = fixture();
    f.source.validate.mockReturnValueOnce([
      {
        address,
        assets: {
          nativeToken: 90_000_000n,
          tokens: [{ id: 'unexpected', value: 1n }],
        },
      },
    ]);
    await expect(f.authority.capture(f.snapshot, f.context)).rejects.toThrow(
      'payment fields',
    );
    expect(f.source.observe).not.toHaveBeenCalled();
  });

  it('returns null only for a valid absent, mempool, or immature observation', async () => {
    const f = fixture(3);
    f.setObservation({ kind: 'absent' });
    await expect(
      f.authority.capture(f.snapshot, f.context),
    ).resolves.toBeNull();
    f.setObservation({ kind: 'mempool', txId, hex: signedHex });
    await expect(
      f.authority.capture(f.snapshot, f.context),
    ).resolves.toBeNull();
    f.setObservation(confirmed({ confirmations: 2 }));
    await expect(
      f.authority.capture(f.snapshot, f.context),
    ).resolves.toBeNull();

    f.setObservation({
      kind: 'mempool',
      txId: 'ff'.repeat(32),
      hex: signedHex,
    });
    await expect(f.authority.capture(f.snapshot, f.context)).rejects.toThrow(
      'observation identity',
    );
    f.setObservation({
      kind: 'mempool',
      txId,
      hex: signedHex,
      extra: true,
    } as unknown as ZcashTransactionObservation);
    await expect(f.authority.capture(f.snapshot, f.context)).rejects.toThrow(
      'observation',
    );
    const outage = Error('controlled outage');
    f.source.observe.mockRejectedValueOnce(outage);
    await expect(f.authority.capture(f.snapshot, f.context)).rejects.toBe(
      outage,
    );
  });

  it('binds source callbacks and rejects policy mutation across an observation await', async () => {
    const f = fixture();
    const originalObserve = f.source.observe;
    let release!: (value: ZcashTransactionObservation) => void;
    const pending = new Promise<ZcashTransactionObservation>((resolve) => {
      release = resolve;
    });
    f.source.observe.mockImplementationOnce(function (this: unknown) {
      expect(this).toBe(f.source);
      return pending;
    });
    const captured = f.authority.capture(f.snapshot, f.context);
    await vi.waitFor(() => expect(f.source.observe).toHaveBeenCalledTimes(1));
    f.source.validate = vi.fn(() => {
      throw Error('replacement validate');
    });
    f.source.observe = vi.fn(async () => {
      throw Error('replacement observe');
    });
    f.source.policy = vi.fn(() => {
      throw Error('replacement policy');
    });
    release(confirmed());
    const boundResult = await captured;
    expect(boundResult).not.toBeNull();
    await expect(boundResult!.assertCurrent()).resolves.toBeUndefined();
    expect(originalObserve).toHaveBeenCalledTimes(2);

    const changed = fixture();
    let releaseChanged!: (value: ZcashTransactionObservation) => void;
    changed.source.observe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseChanged = resolve;
        }),
    );
    const rejected = changed.authority.capture(
      changed.snapshot,
      changed.context,
    );
    await vi.waitFor(() =>
      expect(changed.source.observe).toHaveBeenCalledTimes(1),
    );
    changed.setPolicy({ ...changed.policy, sourceId: 'other-source' });
    releaseChanged(confirmed());
    await expect(rejected).rejects.toThrow('policy changed');
  });

  it('rejects policy mutation across a currentness observation await', async () => {
    const f = fixture();
    const result = await capture(f);
    let release!: (value: ZcashTransactionObservation) => void;
    f.source.observe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const current = result.assertCurrent();
    await vi.waitFor(() => expect(f.source.observe).toHaveBeenCalledTimes(2));
    f.setPolicy({ ...f.policy, sourceId: 'other-source' });
    release(confirmed());
    await expect(current).rejects.toThrow('policy changed');
  });

  it('rechecks the same active block and rejects confirmation loss or reorg', async () => {
    const f = fixture();
    const result = await capture(f);
    f.setObservation(confirmed({ confirmations: 9 }));
    await expect(result.assertCurrent()).resolves.toBeUndefined();

    for (const observation of [
      confirmed({ confirmations: 1 }),
      { kind: 'mempool', txId, hex: signedHex },
      confirmed({ blockHash: 'cc'.repeat(32) }),
      confirmed({ height: 121 }),
      confirmed({ hex: 'cafebabe' }),
      confirmed({ txId: 'dd'.repeat(32) }),
    ] satisfies ZcashTransactionObservation[]) {
      f.setObservation(observation);
      await expect(result.assertCurrent()).rejects.toThrow();
    }
    const outage = Error('fresh observation unavailable');
    f.source.observe.mockRejectedValueOnce(outage);
    await expect(result.assertCurrent()).rejects.toBe(outage);
  });

  it('rejects expired, future-dated, and policy-stale issued decisions', async () => {
    const f = fixture();
    const result = await capture(f);
    f.setClock(6_000);
    expect(() => result.assertPolicyCurrent()).not.toThrow();
    f.setClock(6_001);
    expect(() => result.assertPolicyCurrent()).toThrow('expired');
    f.setClock(999);
    expect(() => result.assertPolicyCurrent()).toThrow('expired');
    f.setClock(1_000);
    f.setPolicy({ ...f.policy, requiredConfirmations: 4 });
    expect(() => result.assertPolicyCurrent()).toThrow('policy changed');
  });

  it('validates snapshot and binding identity before native validation or observation', async () => {
    for (const snapshot of [
      { ...fixture().snapshot, txId: 'ee'.repeat(32) },
      { ...fixture().snapshot, eventId: 'ff'.repeat(32) },
      {
        ...fixture().snapshot,
        binding: binding({ genesisHash: '00'.repeat(32) }),
      },
    ]) {
      const f = fixture();
      await expect(f.authority.capture(snapshot, f.context)).rejects.toThrow(
        'snapshot binding',
      );
      expect(f.source.validate).not.toHaveBeenCalled();
      expect(f.source.observe).not.toHaveBeenCalled();
    }
  });

  it.each(invalidReceiptCases)(
    'rejects an invalid receipt %s field in isolation',
    async (_field, mutate) => {
      const receipt = (await capture(fixture())).receipt;
      expect(() => encodeZcashSettlementReceipt(mutate(receipt))).toThrow();
    },
  );

  it('strictly decodes receipt shape and canonical ordering', async () => {
    const receipt = (await capture(fixture())).receipt;
    expect(() =>
      encodeZcashSettlementReceipt({
        ...receipt,
        extra: true,
      } as unknown as ZcashSettlementReceipt),
    ).toThrow('receipt shape');
    const canonical = encodeZcashSettlementReceipt(receipt);
    expect(() => decodeZcashSettlementReceipt(' ' + canonical)).toThrow(
      'noncanonical',
    );
    const reordered = JSON.stringify(JSON.parse(canonical), [
      ...Object.keys(JSON.parse(canonical)).reverse(),
    ]);
    expect(() => decodeZcashSettlementReceipt(reordered)).toThrow(
      'noncanonical',
    );
  });

  it('rejects invalid policy bounds at construction', () => {
    for (const policy of [
      { ...fixture().policy, requiredConfirmations: 0 },
      { ...fixture().policy, maximumAgeMs: 0 },
      { ...fixture().policy, maximumAgeMs: 300_001 },
      { ...fixture().policy, genesisHash: 'AA'.repeat(32) },
      { ...fixture().policy, sourceId: 'contains space' },
    ]) {
      const f = fixture();
      f.setPolicy(policy as ZcashConfirmationPolicy);
      expect(() => new ZcashConfirmationAuthority(f.source)).toThrow('policy');
    }
  });
});
