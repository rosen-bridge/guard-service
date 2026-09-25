import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { calculateApprovalHash } from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ArbitraryEntity } from '../../src/db/entities/arbitraryEntity';
import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { Migration1789900001000 } from '../../src/db/migrations/sqlite/1789900001000-migration';
import {
  withZcashSigningTransaction,
  ZcashSigningAttemptStore,
} from '../../src/db/zcashSigningAttemptStore';
import { ZcashSigningBinding } from '../../src/transaction/zcashSigningContext';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/databaseAction.mock';

// Structural certificates and byte placeholders test storage, not native signing or approval crypto.
function binding(
  txId = 'ab'.repeat(32),
  eventId = 'cd'.repeat(32),
): ZcashSigningBinding {
  const approvedTxJson = JSON.stringify({
    eventId,
    network: 'zcash',
    txBytes: '01',
    txId,
    txType: 'payment',
  });
  return {
    schema: 1,
    txId,
    eventId,
    approvedTxJson,
    approvalEvidence: JSON.stringify({
      schema: 1,
      approvedTxJson,
      txDataHash: calculateApprovalHash(approvedTxJson),
      timestamp: 1789900000,
      protocolVersion: '1.0.0',
      guardPublicKeys: [
        '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      ],
      signatures: ['11'.repeat(64)],
      requiredSign: 1,
    }),
    requiredSign: 1,
    genesisHash: 'ee'.repeat(32),
    outpoint: `${'ff'.repeat(32)}:0`,
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
}

async function seed(source: DataSource, value: ZcashSigningBinding) {
  await source
    .getRepository(ConfirmedEventEntity)
    .upsert(
      { id: value.eventId, status: EventStatus.inPayment, unexpectedFails: 0 },
      ['id'],
    );
  await source.getRepository(TransactionEntity).insert({
    txId: value.txId,
    txJson: value.approvedTxJson,
    approvalEvidence: value.approvalEvidence,
    chain: 'zcash',
    type: 'payment',
    status: TransactionStatus.approved,
    requiredSign: value.requiredSign,
    event: { id: value.eventId },
    order: null,
    lastCheck: 123,
    failedInSign: false,
    signFailedCount: 0,
  });
}

const signed = (value: ZcashSigningBinding, txBytes = '02') =>
  JSON.stringify({ ...JSON.parse(value.approvedTxJson), txBytes });
const txRow = (source: DataSource, value: ZcashSigningBinding) =>
  source.getRepository(TransactionEntity).findOneByOrFail({ txId: value.txId });
const attemptRow = (source: DataSource, attemptId = 'attempt-1') =>
  source
    .getRepository(ZcashSigningAttemptEntity)
    .findOneByOrFail({ attemptId });

describe('durable Zcash signing attempts', () => {
  const source = DatabaseActionMock.testDataSource;
  const store = new ZcashSigningAttemptStore(source);
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  it('claims the approved row and persists both reservations atomically', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    const attempt = await source
      .getRepository(ZcashSigningAttemptEntity)
      .findOneBy({ attemptId: 'attempt-1' });
    expect(attempt?.state).toBe('prepared');
    expect(attempt?.eventKey).toBe(`zcash:payment:${value.eventId}`);
    expect(attempt?.inputKey).toBe(`${value.genesisHash}:${value.outpoint}`);
    expect(
      (
        await source
          .getRepository(TransactionEntity)
          .findOneByOrFail({ txId: value.txId })
      ).status,
    ).toBe(TransactionStatus.inSign);
    expect((await txRow(source, value)).signingAttemptId).toBe('attempt-1');
    expect(
      (
        await source
          .getRepository(ConfirmedEventEntity)
          .findOneByOrFail({ id: value.eventId })
      ).zcashSigningAttemptId,
    ).toBe('attempt-1');
  });

  it('marks once, stores the signed outcome, and never rewinds sent/completed on exact retry', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await store.markMayDispatch('attempt-1', value);
    await expect(store.markMayDispatch('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    // Revocation after dispatch must not erase a signature that was actually produced.
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: value.eventId }, { status: EventStatus.completed });
    await store.complete('attempt-1', value, signed(value));
    expect((await txRow(source, value)).lastCheck).toBe(123);
    expect((await attemptRow(source)).signedJson).toBe(signed(value));
    for (const status of [
      TransactionStatus.signed,
      TransactionStatus.sent,
      TransactionStatus.completed,
    ]) {
      await source
        .getRepository(TransactionEntity)
        .update({ txId: value.txId }, { status });
      await store.complete('attempt-1', value, signed(value));
      expect((await txRow(source, value)).status).toBe(status);
    }
    await expect(
      store.complete('attempt-1', value, signed(value, '03')),
    ).rejects.toThrow('conflict');
    await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
  });

  it('abandons only prepared custody, preserves revoked event status, and fences old callbacks', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: value.eventId }, { status: EventStatus.completed });
    await store.abandonPrepared('attempt-1', value);
    expect(await store.getActive(value.txId)).toBeNull();
    expect((await txRow(source, value)).signingAttemptId).toBeNull();
    const event = await source
      .getRepository(ConfirmedEventEntity)
      .findOneByOrFail({ id: value.eventId });
    expect(event.status).toBe(EventStatus.completed);
    expect(event.zcashSigningAttemptId).toBeNull();
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: value.eventId }, { status: EventStatus.inPayment });
    await store.claim('attempt-2', value);
    await expect(store.markMayDispatch('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    await expect(
      store.complete('attempt-1', value, signed(value)),
    ).rejects.toThrow('conflict');
    await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    expect((await store.getActive(value.txId))?.attemptId).toBe('attempt-2');
  });

  it.each([
    ['eventKey', 'zcash:payment:other'],
    ['inputKey', 'other:0'],
  ] as const)(
    'refuses abandonment after direct %s custody drift and rolls back row/event release',
    async (key, changed) => {
      const value = binding();
      await seed(source, value);
      await store.claim('attempt-1', value);
      await source
        .getRepository(ZcashSigningAttemptEntity)
        .update({ attemptId: 'attempt-1' }, { [key]: changed });

      await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
        'conflict',
      );
      const attempt = await attemptRow(source);
      expect(attempt[key]).toBe(changed);
      expect(attempt.state).toBe('prepared');
      expect(attempt.activeTxId).toBe(value.txId);
      expect((await txRow(source, value)).status).toBe(
        TransactionStatus.inSign,
      );
      expect((await txRow(source, value)).signingAttemptId).toBe('attempt-1');
      expect(
        (
          await source
            .getRepository(ConfirmedEventEntity)
            .findOneByOrFail({ id: value.eventId })
        ).zcashSigningAttemptId,
      ).toBe('attempt-1');
    },
  );

  it('retains reservation after dispatch and does not permit uncertain retries', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await store.markMayDispatch('attempt-1', value);
    await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    await expect(store.claim('attempt-2', value)).rejects.toThrow();
    expect((await store.getActive(value.txId))?.state).toBe('may_dispatch');
  });

  it('rejects completion before dispatch', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await expect(
      store.complete('attempt-1', value, signed(value)),
    ).rejects.toThrow('conflict');
    expect((await attemptRow(source)).state).toBe('prepared');
  });

  for (const field of ['txId', 'network', 'eventId', 'txType'] as const) {
    it(`rejects signed outer identity drift: ${field}`, async () => {
      const value = binding();
      await seed(source, value);
      await store.claim('attempt-1', value);
      await store.markMayDispatch('attempt-1', value);
      const result = JSON.parse(signed(value));
      result[field] = 'different';
      await expect(
        store.complete('attempt-1', value, JSON.stringify(result)),
      ).rejects.toThrow('transaction identity');
      expect((await attemptRow(source)).state).toBe('may_dispatch');
    });
  }
  it('refuses unsigned-identical or noncanonical completion bytes', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await store.markMayDispatch('attempt-1', value);
    await expect(
      store.complete('attempt-1', value, value.approvedTxJson),
    ).rejects.toThrow('conflict');
    await expect(
      store.complete('attempt-1', value, signed(value) + ' '),
    ).rejects.toThrow('noncanonical');
  });

  const rowFaults: Array<[string, Record<string, unknown>]> = [
    ['status', { status: TransactionStatus.signed }],
    ['JSON', { txJson: '{}' }],
    ['certificate', { approvalEvidence: null }],
    ['threshold', { requiredSign: 2 }],
    ['chain', { chain: 'ergo' }],
    ['type', { type: 'reward' }],
    ['event', { event: { id: 'aa'.repeat(32) } }],
    ['order', { order: { id: 'aa'.repeat(32) } }],
    ['owner', { signingAttemptId: 'other-attempt' }],
  ];

  describe('dispatch currentness', () => {
    const rows = async () => ({
      events: await source.getRepository(ConfirmedEventEntity).find(),
      transactions: await source.getRepository(TransactionEntity).find(),
      attempts: await source.getRepository(ZcashSigningAttemptEntity).find(),
    });

    it('rechecks repeatedly without changing any stored fields or enabling another mark', async () => {
      const value = binding();
      await seed(source, value);
      await store.claim('attempt-1', value);
      await store.markMayDispatch('attempt-1', value);
      const before = await rows();
      await store.assertMayDispatchCurrent('attempt-1', value);
      await store.assertMayDispatchCurrent('attempt-1', value);
      expect(await rows()).toEqual(before);
      await expect(store.markMayDispatch('attempt-1', value)).rejects.toThrow(
        'conflict',
      );
      await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
        'conflict',
      );
    });

    for (const [label, fault] of rowFaults) {
      it(`refuses changed transaction ${label}`, async () => {
        const value = binding();
        await seed(source, value);
        await source
          .getRepository(ConfirmedEventEntity)
          .insert({ id: 'aa'.repeat(32), status: EventStatus.inPayment });
        await source.getRepository(ArbitraryEntity).insert({
          id: 'aa'.repeat(32),
          chain: 'zcash',
          orderJson: '{}',
          status: 'pending',
        });
        await store.claim('attempt-1', value);
        await store.markMayDispatch('attempt-1', value);
        await source
          .getRepository(TransactionEntity)
          .update({ txId: value.txId }, fault);
        const before = await rows();
        await expect(
          store.assertMayDispatchCurrent('attempt-1', value),
        ).rejects.toThrow('conflict');
        expect(await rows()).toEqual(before);
      });
    }

    for (const status of [EventStatus.spent, EventStatus.rejected]) {
      it(`refuses event ${status} after an earlier successful check`, async () => {
        const value = binding();
        await seed(source, value);
        await store.claim('attempt-1', value);
        await store.markMayDispatch('attempt-1', value);
        await store.assertMayDispatchCurrent('attempt-1', value);
        await source
          .getRepository(ConfirmedEventEntity)
          .update({ id: value.eventId }, { status });
        const before = await rows();
        await expect(
          store.assertMayDispatchCurrent('attempt-1', value),
        ).rejects.toThrow('conflict');
        expect(await rows()).toEqual(before);
      });
    }

    for (const owner of ['other', null]) {
      it(`refuses changed event owner ${owner}`, async () => {
        const value = binding();
        await seed(source, value);
        await store.claim('attempt-1', value);
        await store.markMayDispatch('attempt-1', value);
        await source
          .getRepository(ConfirmedEventEntity)
          .update({ id: value.eventId }, { zcashSigningAttemptId: owner });
        const before = await rows();
        await expect(
          store.assertMayDispatchCurrent('attempt-1', value),
        ).rejects.toThrow('conflict');
        expect(await rows()).toEqual(before);
      });
    }

    for (const field of [
      'genesisHash',
      'outpoint',
      'sighashAll',
      'tssProfileHash',
    ] as const) {
      it(`refuses changed supplied binding ${field}`, async () => {
        const value = binding();
        await seed(source, value);
        await store.claim('attempt-1', value);
        await store.markMayDispatch('attempt-1', value);
        const different = {
          ...value,
          [field]:
            field === 'outpoint' ? `${'aa'.repeat(32)}:1` : 'aa'.repeat(32),
        };
        const before = await rows();
        await expect(
          store.assertMayDispatchCurrent('attempt-1', different),
        ).rejects.toThrow('conflict');
        expect(await rows()).toEqual(before);
      });
    }

    for (const [field, changed] of [
      ['bindingJson', '{}'],
      ['eventKey', 'zcash:payment:other'],
      ['inputKey', 'other:0'],
      ['signedJson', '{}'],
      ['state', 'prepared'],
      ['state', 'signed'],
    ]) {
      it(`refuses changed attempt ${field}=${changed}`, async () => {
        const value = binding();
        await seed(source, value);
        await store.claim('attempt-1', value);
        await store.markMayDispatch('attempt-1', value);
        await source
          .getRepository(ZcashSigningAttemptEntity)
          .update({ attemptId: 'attempt-1' }, { [field]: changed });
        const before = await rows();
        await expect(
          store.assertMayDispatchCurrent('attempt-1', value),
        ).rejects.toThrow('conflict');
        expect(await rows()).toEqual(before);
      });
    }

    it('refuses actual prepared, abandoned, and completed attempts', async () => {
      const value = binding();
      await seed(source, value);
      await store.claim('attempt-1', value);
      await expect(
        store.assertMayDispatchCurrent('attempt-1', value),
      ).rejects.toThrow('conflict');
      await store.abandonPrepared('attempt-1', value);
      await expect(
        store.assertMayDispatchCurrent('attempt-1', value),
      ).rejects.toThrow('conflict');
      await store.claim('attempt-2', value);
      await store.markMayDispatch('attempt-2', value);
      await expect(
        store.assertMayDispatchCurrent('attempt-1', value),
      ).rejects.toThrow('conflict');
      await store.complete('attempt-2', value, signed(value));
      await expect(
        store.assertMayDispatchCurrent('attempt-2', value),
      ).rejects.toThrow('conflict');
      expect((await attemptRow(source, 'attempt-2')).state).toBe('signed');
    });

    it('observes revocation committed by an independent SQLite connection', async () => {
      const directory = await mkdtemp(
        join(tmpdir(), 'rosen-zcash-currentness-'),
      );
      const options = source.options;
      if (options.type !== 'sqlite') throw Error('SQLite fixture required');
      const configuration = {
        ...options,
        database: join(directory, 'current.sqlite'),
      };
      const first = await new DataSource(configuration).initialize();
      await first.runMigrations();
      const second = await new DataSource(configuration).initialize();
      try {
        const value = binding();
        await seed(first, value);
        const checker = new ZcashSigningAttemptStore(first);
        await checker.claim('attempt-1', value);
        await checker.markMayDispatch('attempt-1', value);
        await checker.assertMayDispatchCurrent('attempt-1', value);
        await second
          .getRepository(ConfirmedEventEntity)
          .update({ id: value.eventId }, { status: EventStatus.spent });
        await expect(
          checker.assertMayDispatchCurrent('attempt-1', value),
        ).rejects.toThrow('conflict');
        expect((await attemptRow(first)).state).toBe('may_dispatch');
        expect((await txRow(first, value)).signingAttemptId).toBe('attempt-1');
      } finally {
        await second.destroy();
        await first.destroy();
      }
    }, 30_000);
  });
  for (const phase of ['claim', 'mark', 'complete', 'abandon'] as const) {
    for (const [label, fault] of rowFaults) {
      it(`rejects ${phase} against changed row ${label}`, async () => {
        const value = binding();
        await seed(source, value);
        await source
          .getRepository(ConfirmedEventEntity)
          .insert({ id: 'aa'.repeat(32), status: EventStatus.inPayment });
        await source.getRepository(ArbitraryEntity).insert({
          id: 'aa'.repeat(32),
          chain: 'zcash',
          orderJson: '{}',
          status: 'pending',
        });
        if (phase !== 'claim') await store.claim('attempt-1', value);
        if (phase === 'complete')
          await store.markMayDispatch('attempt-1', value);
        await source
          .getRepository(TransactionEntity)
          .update({ txId: value.txId }, fault);
        const before = await txRow(source, value);
        const action =
          phase === 'claim'
            ? store.claim('attempt-1', value)
            : phase === 'mark'
              ? store.markMayDispatch('attempt-1', value)
              : phase === 'complete'
                ? store.complete('attempt-1', value, signed(value))
                : store.abandonPrepared('attempt-1', value);
        await expect(action).rejects.toThrow('conflict');
        expect(await txRow(source, value)).toEqual(before);
        if (phase === 'claim')
          expect(await store.getActive(value.txId)).toBeNull();
        else
          expect((await attemptRow(source)).state).toBe(
            phase === 'complete' ? 'may_dispatch' : 'prepared',
          );
      });
    }
  }

  for (const phase of ['claim', 'mark'] as const) {
    for (const field of ['status', 'owner'] as const) {
      it(`requires current event ${field} at ${phase}`, async () => {
        const value = binding();
        await seed(source, value);
        if (phase === 'mark') await store.claim('attempt-1', value);
        await source
          .getRepository(ConfirmedEventEntity)
          .update(
            { id: value.eventId },
            field === 'status'
              ? { status: EventStatus.pendingPayment }
              : { zcashSigningAttemptId: 'another' },
          );
        await expect(
          phase === 'claim'
            ? store.claim('attempt-1', value)
            : store.markMayDispatch('attempt-1', value),
        ).rejects.toThrow('conflict');
      });
    }
  }

  for (const field of [
    'genesisHash',
    'outpoint',
    'sighashAll',
    'tssProfileHash',
  ] as const) {
    it(`rejects a different immutable binding ${field}`, async () => {
      const value = binding();
      await seed(source, value);
      await store.claim('attempt-1', value);
      const different = {
        ...value,
        [field]:
          field === 'outpoint' ? `${'aa'.repeat(32)}:1` : 'aa'.repeat(32),
      };
      await expect(
        store.markMayDispatch('attempt-1', different),
      ).rejects.toThrow('conflict');
      await expect(
        store.abandonPrepared('attempt-1', different),
      ).rejects.toThrow('conflict');
      await store.markMayDispatch('attempt-1', value);
      await expect(
        store.complete('attempt-1', different, signed(value)),
      ).rejects.toThrow('conflict');
    });
  }

  for (const phase of ['claim', 'mark', 'complete', 'abandon'] as const) {
    it(`rolls back every partial write on injected ${phase} failure`, async () => {
      const value = binding();
      await seed(source, value);
      if (phase !== 'claim') await store.claim('attempt-1', value);
      if (phase === 'complete') await store.markMayDispatch('attempt-1', value);
      const before = await txRow(source, value);
      const previousEvent = await source
        .getRepository(ConfirmedEventEntity)
        .findOneByOrFail({ id: value.eventId });
      const target =
        phase === 'claim'
          ? 'prepared'
          : phase === 'abandon'
            ? 'abandoned'
            : phase === 'mark'
              ? 'may_dispatch'
              : 'signed';
      const operation = phase === 'claim' ? 'INSERT' : 'UPDATE';
      await source.query(
        `CREATE TRIGGER attempt_write_failure BEFORE ${operation} ON "zcash_signing_attempt_entity" WHEN NEW."state" = '${target}' BEGIN SELECT RAISE(ABORT, 'controlled write failure'); END`,
      );
      try {
        const action =
          phase === 'claim'
            ? store.claim('attempt-1', value)
            : phase === 'mark'
              ? store.markMayDispatch('attempt-1', value)
              : phase === 'complete'
                ? store.complete('attempt-1', value, signed(value))
                : store.abandonPrepared('attempt-1', value);
        await expect(action).rejects.toThrow('controlled write failure');
      } finally {
        await source.query('DROP TRIGGER attempt_write_failure');
      }
      expect(await txRow(source, value)).toEqual(before);
      expect(
        await source
          .getRepository(ConfirmedEventEntity)
          .findOneByOrFail({ id: value.eventId }),
      ).toEqual(previousEvent);
      if (phase === 'claim')
        expect(await store.getActive(value.txId)).toBeNull();
      else
        expect((await attemptRow(source)).state).toBe(
          phase === 'complete' ? 'may_dispatch' : 'prepared',
        );
    });
  }

  it('captures binding before waiting for the connection transaction queue', async () => {
    const value = binding();
    await seed(source, value);
    let release!: () => void;
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held = withZcashSigningTransaction(source, async () => {
      entered();
      await wait;
    });
    await ready;
    const caller = { ...value };
    const claim = store.claim('attempt-1', caller);
    caller.tssProfileHash = 'aa'.repeat(32);
    caller.outpoint = `${'bb'.repeat(32)}:7`;
    release();
    await held;
    await claim;
    expect(JSON.parse((await attemptRow(source)).bindingJson)).toEqual(value);
  });

  it('rejects event marker loss on abandonment without freeing the attempt', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: value.eventId }, { zcashSigningAttemptId: 'new-owner' });
    await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    expect((await attemptRow(source)).state).toBe('prepared');
    expect((await txRow(source, value)).signingAttemptId).toBe('attempt-1');
  });

  it('retains FK custody throughout prepared, may-dispatch, and signed states', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    for (const state of ['prepared', 'may_dispatch', 'signed']) {
      if (state === 'may_dispatch')
        await store.markMayDispatch('attempt-1', value);
      if (state === 'signed')
        await store.complete('attempt-1', value, signed(value));
      expect((await attemptRow(source)).activeTxId).toBe(value.txId);
      await expect(
        source.getRepository(TransactionEntity).delete({ txId: value.txId }),
      ).rejects.toThrow('FOREIGN KEY');
      await expect(
        source
          .getRepository(TransactionEntity)
          .update({ txId: value.txId }, { txId: 'aa'.repeat(32) }),
      ).rejects.toThrow('FOREIGN KEY');
    }
  });

  it('permits actual replacement after abandonment while retaining immutable audit identity', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await store.abandonPrepared('attempt-1', value);
    const next = binding('aa'.repeat(32), value.eventId);
    const replacement = new PaymentTransaction(
      'zcash',
      next.txId,
      next.eventId,
      Buffer.from('01', 'hex'),
      TransactionType.payment,
    );
    expect(replacement.toJson()).toBe(next.approvedTxJson);
    await DatabaseAction.getInstance().replaceTx(
      value.txId,
      replacement,
      1,
      next.approvalEvidence,
    );
    expect(
      await source
        .getRepository(TransactionEntity)
        .findOneBy({ txId: value.txId }),
    ).toBeNull();
    expect((await txRow(source, next)).txJson).toBe(next.approvedTxJson);
    expect((await attemptRow(source)).txId).toBe(value.txId);
    expect((await attemptRow(source)).activeTxId).toBeNull();
    await store.claim('attempt-2', next);
    await expect(store.markMayDispatch('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    await expect(
      store.complete('attempt-1', value, signed(value)),
    ).rejects.toThrow('conflict');
    await expect(store.abandonPrepared('attempt-1', value)).rejects.toThrow(
      'conflict',
    );
    expect((await store.getActive(next.txId))?.attemptId).toBe('attempt-2');
  });

  it('refuses completion under a changed event owner without losing pending custody', async () => {
    const value = binding();
    await seed(source, value);
    await store.claim('attempt-1', value);
    await store.markMayDispatch('attempt-1', value);
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: value.eventId }, { zcashSigningAttemptId: 'new-owner' });
    await expect(
      store.complete('attempt-1', value, signed(value)),
    ).rejects.toThrow('conflict');
    expect((await attemptRow(source)).state).toBe('may_dispatch');
    expect((await txRow(source, value)).txJson).toBe(value.approvedTxJson);
  });

  for (const key of ['eventKey', 'inputKey'] as const) {
    it(`enforces the ${key} partial unique index even for direct SQL inserts`, async () => {
      const one = binding();
      const two = binding('bc'.repeat(32), 'de'.repeat(32));
      await seed(source, one);
      await seed(source, two);
      await store.claim('attempt-1', one);
      const original = await attemptRow(source);
      const conflicting = {
        ...original,
        attemptId: 'bypass',
        txId: two.txId,
        activeTxId: two.txId,
        eventKey:
          key === 'eventKey'
            ? original.eventKey
            : `zcash:payment:${two.eventId}`,
        inputKey:
          key === 'inputKey'
            ? original.inputKey
            : `${one.genesisHash}:${'aa'.repeat(32)}:1`,
      };
      await expect(
        source.getRepository(ZcashSigningAttemptEntity).insert(conflicting),
      ).rejects.toThrow(`zcash_signing_attempt_entity.${key}`);
      await store.abandonPrepared('attempt-1', one);
      await source.getRepository(ZcashSigningAttemptEntity).insert(conflicting);
    });
  }

  it('adds nullable markers without changing pre-existing legacy rows', async () => {
    const legacy = await new DataSource({
      type: 'sqlite',
      database: ':memory:',
    }).initialize();
    const runner = legacy.createQueryRunner();
    try {
      await runner.query(
        'CREATE TABLE transaction_entity ("txId" varchar PRIMARY KEY, "txJson" text NOT NULL)',
      );
      await runner.query(
        'CREATE TABLE confirmed_event_entity ("id" varchar PRIMARY KEY, "status" varchar NOT NULL)',
      );
      await runner.query(
        "INSERT INTO transaction_entity VALUES ('legacy-tx', 'legacy-json')",
      );
      await runner.query(
        "INSERT INTO confirmed_event_entity VALUES ('legacy-event', 'pending-payment')",
      );
      await new Migration1789900001000().up(runner);
      expect(await runner.query('SELECT * FROM transaction_entity')).toEqual([
        { txId: 'legacy-tx', txJson: 'legacy-json', signingAttemptId: null },
      ]);
      expect(
        await runner.query('SELECT * FROM confirmed_event_entity'),
      ).toEqual([
        {
          id: 'legacy-event',
          status: 'pending-payment',
          zcashSigningAttemptId: null,
        },
      ]);
    } finally {
      await runner.release();
      await legacy.destroy();
    }
  });

  for (const [state, activeTxId] of [
    ['prepared', null],
    ['may_dispatch', null],
    ['signed', null],
    ['abandoned', 'ab'.repeat(32)],
    ['prepared', 'bc'.repeat(32)],
  ] as const) {
    it(`enforces SQL active/audit identity CHECK for ${state}/${activeTxId ?? 'null'}`, async () => {
      const value = binding();
      await seed(source, value);
      await seed(source, binding('bc'.repeat(32), 'de'.repeat(32)));
      await store.claim('attempt-1', value);
      await expect(
        source
          .getRepository(ZcashSigningAttemptEntity)
          .update({ attemptId: 'attempt-1' }, { state, activeTxId }),
      ).rejects.toThrow('CHECK constraint failed');
      expect((await attemptRow(source)).activeTxId).toBe(value.txId);
      expect((await attemptRow(source)).state).toBe('prepared');
    });
  }

  for (const conflict of ['event', 'input', 'same-proposal'] as const) {
    it(`enforces ${conflict} custody across two independent file SQLite connections and restart`, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'rosen-zcash-attempt-'));
      const database = join(directory, 'attempts.sqlite');
      const fixtureOptions = source.options;
      if (fixtureOptions.type !== 'sqlite')
        throw Error('SQLite fixture required');
      const options = { ...fixtureOptions, database };
      const first = await new DataSource(options).initialize();
      await first.runMigrations();
      const second = await new DataSource(options).initialize();
      try {
        await first.query('PRAGMA busy_timeout = 5000');
        await second.query('PRAGMA busy_timeout = 5000');
        const one = binding();
        const two =
          conflict === 'same-proposal'
            ? one
            : {
                ...binding(
                  'bc'.repeat(32),
                  conflict === 'event' ? one.eventId : 'de'.repeat(32),
                ),
                outpoint:
                  conflict === 'event' ? `${'11'.repeat(32)}:0` : one.outpoint,
              };
        await seed(first, one);
        if (two !== one) await seed(first, two);
        const attempts = await Promise.allSettled([
          new ZcashSigningAttemptStore(first).claim('first', one),
          new ZcashSigningAttemptStore(second).claim('second', two),
        ]);
        expect(
          attempts.filter((result) => result.status === 'fulfilled'),
        ).toHaveLength(1);
        expect(
          await first.getRepository(ZcashSigningAttemptEntity).count(),
        ).toBe(1);
        const winner = await first
          .getRepository(ZcashSigningAttemptEntity)
          .findOneByOrFail({ state: 'prepared' });
        const accepted = winner.attemptId === 'first' ? one : two;
        // With the winner settled, the loser is still refused (not merely SQLITE_BUSY).
        const loser = winner.attemptId === 'first' ? two : one;
        await expect(
          new ZcashSigningAttemptStore(second).claim('third', loser),
        ).rejects.toThrow();
        await first.destroy();
        await second.destroy();
        const reopened = await new DataSource(options).initialize();
        try {
          const restarted = new ZcashSigningAttemptStore(reopened);
          expect((await restarted.getActive(accepted.txId))?.attemptId).toBe(
            winner.attemptId,
          );
          await restarted.markMayDispatch(winner.attemptId, accepted);
        } finally {
          await reopened.destroy();
        }
        const again = await new DataSource(options).initialize();
        try {
          const restarted = new ZcashSigningAttemptStore(again);
          expect((await restarted.getActive(accepted.txId))?.state).toBe(
            'may_dispatch',
          );
          await expect(
            restarted.abandonPrepared(winner.attemptId, accepted),
          ).rejects.toThrow('conflict');
          await restarted.complete(
            winner.attemptId,
            accepted,
            signed(accepted),
          );
          expect((await restarted.getActive(accepted.txId))?.state).toBe(
            'signed',
          );
        } finally {
          await again.destroy();
        }
      } finally {
        if (first.isInitialized) await first.destroy();
        if (second.isInitialized) await second.destroy();
      }
    }, 30_000);
  }
});
