import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenTokens } from '@rosen-bridge/tokens';
import {
  EventTrigger,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { createTransactionApproval } from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { ZcashBroadcastStore } from '../../src/db/zcashBroadcastStore';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { ZcashEventPaymentAuthority } from '../../src/transaction/zcashEventPaymentAuthority';
import {
  encodeZcashSigningBinding,
  type ZcashSigningBinding,
} from '../../src/transaction/zcashSigningContext';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/databaseAction.mock';

// Storage certificates and byte placeholders exercise custody only, not native signing or TSS crypto.
const source = DatabaseActionMock.testDataSource;
const tokenMap = TokenHandler.getInstance().getTokenMap();
const guardKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const sourceToken = 'cardano-zec';
const tokenConfig = (): RosenTokens => [
  {
    zcash: {
      tokenId: 'zec',
      name: 'ZEC',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
    ergo: {
      tokenId: 'ab'.repeat(32),
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
    cardano: {
      tokenId: sourceToken,
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
  },
];
const event = (): EventTrigger => ({
  height: 106,
  fromChain: 'cardano',
  toChain: 'zcash',
  fromAddress: 'source',
  toAddress: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs',
  amount: '100000000',
  bridgeFee: '1000000',
  networkFee: '10000',
  sourceChainTokenId: sourceToken,
  targetChainTokenId: 'zec',
  sourceTxId: '11'.repeat(32),
  sourceChainHeight: 106,
  sourceBlockId: '22'.repeat(32),
  WIDsHash: '33'.repeat(32),
  WIDsCount: 4,
});
const fee = (): ChainMinimumFee =>
  ({
    bridgeFee: 2_000_000n,
    networkFee: 20_000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 100n,
    feeRatioDivisor: 10_000n,
  }) as ChainMinimumFee;

const approval = (
  approvedTxJson: string,
  requiredSign = 1,
  timestamp = 1_789_900_000,
): string =>
  createTransactionApproval(
    approvedTxJson,
    timestamp,
    Array.from({ length: requiredSign }, (_, index) =>
      (index + 1).toString(16).padStart(128, '0'),
    ),
    {
      protocolVersion: '1.0.0',
      guardPublicKeys: Array.from({ length: requiredSign }, (_, index) =>
        index === 0
          ? guardKey
          : `03${(index + 2).toString(16).padStart(64, '0')}`,
      ),
      requiredSign,
    },
  );

const signed = (value: ZcashSigningBinding, bytes = '02'): string =>
  JSON.stringify({ ...JSON.parse(value.approvedTxJson), txBytes: bytes });

let originalTokens: RosenTokens;

beforeAll(() => {
  originalTokens = tokenMap.getRawConfig();
});

beforeEach(async () => {
  await DatabaseActionMock.clearTables();
  await tokenMap.updateConfigByJson(tokenConfig());
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(fee());
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: (chain: string) => {
      if (chain !== 'zcash') throw Error('unexpected chain');
      return { getMinimumNativeToken: () => 1_000n };
    },
  } as unknown as ChainHandler);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await tokenMap.updateConfigByJson(originalTokens);
});

async function fixture() {
  const rawEvent = event();
  const eventId = EventSerializer.getId(rawEvent);
  const txId = 'ab'.repeat(32);
  const proposed = new PaymentTransaction(
    'zcash',
    txId,
    eventId,
    Buffer.from('01', 'hex'),
    TransactionType.payment,
  );
  const certificate = approval(proposed.toJson());
  const binding: ZcashSigningBinding = {
    schema: 1,
    txId,
    eventId,
    approvedTxJson: proposed.toJson(),
    approvalEvidence: certificate,
    requiredSign: 1,
    genesisHash: 'ee'.repeat(32),
    outpoint: `${'ff'.repeat(32)}:0`,
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
  await DatabaseActionMock.insertEventRecord(
    rawEvent,
    EventStatus.inPayment,
    'event-box',
    rawEvent.sourceChainHeight,
  );
  const db = DatabaseAction.getInstance();
  const storedEvent = await db.getEventById(eventId);
  if (!storedEvent) throw Error('event fixture missing');
  await db.insertNewTx(proposed, storedEvent, 1, null, certificate);
  const signing = new ZcashSigningAttemptStore(source);
  await signing.claim('attempt-1', binding);
  await signing.markMayDispatch('attempt-1', binding);
  await signing.complete('attempt-1', binding, signed(binding));
  const authority = await new ZcashEventPaymentAuthority(source).capture(
    eventId,
  );
  const store = new ZcashBroadcastStore(source);
  return { store, authority, binding, txId, eventId };
}

describe('durable Zcash broadcast custody', () => {
  it('loads only joined signed custody and issues a deeply frozen snapshot', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    expect(snapshot).toMatchObject({
      txId: f.txId,
      eventId: f.eventId,
      attemptId: 'attempt-1',
      signedTxJson: signed(f.binding),
      status: TransactionStatus.signed,
    });
    expect(snapshot.binding).toEqual(f.binding);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.binding)).toBe(true);
    await f.store.assertCurrent(snapshot);
  });

  it('reserves before return and resumes an exact sent snapshot after restart', async () => {
    const f = await fixture();
    const initial = await f.store.load(f.txId);
    const sent = await f.store.reserveSubmission(initial, f.authority);
    expect(sent.status).toBe(TransactionStatus.sent);
    expect((await DatabaseAction.getInstance().getTxById(f.txId))!.status).toBe(
      TransactionStatus.sent,
    );
    await expect(f.store.assertCurrent(initial)).rejects.toThrow(/custody/);

    const restarted = new ZcashBroadcastStore(source);
    const resumed = await restarted.load(f.txId);
    expect(resumed.status).toBe(TransactionStatus.sent);
    const repeated = await restarted.reserveSubmission(resumed, f.authority);
    expect(repeated.status).toBe(TransactionStatus.sent);
  });

  it('marks a native observation after event revocation without granting submission authority', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    await source
      .getRepository(ConfirmedEventEntity)
      .update({ id: f.eventId }, { status: EventStatus.rejected });
    await f.store.assertCurrent(snapshot);
    await expect(
      f.store.reserveSubmission(snapshot, f.authority),
    ).rejects.toThrow(/custody/);
    const observed = await f.store.markObserved(snapshot);
    expect(observed.status).toBe(TransactionStatus.sent);
  });

  it('refuses copied snapshots, cross-store tokens and forged authorities', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    const copy = structuredClone(snapshot);
    await expect(f.store.assertCurrent(copy)).rejects.toThrow(/custody/);
    await expect(
      new ZcashBroadcastStore(source).assertCurrent(snapshot),
    ).rejects.toThrow(/custody/);
    await expect(
      f.store.reserveSubmission(snapshot, { ...f.authority }),
    ).rejects.toThrow(/unknown snapshot/);
  });

  it.each([
    [
      'schema',
      (value: ZcashSigningBinding) =>
        JSON.stringify({
          ...JSON.parse(encodeZcashSigningBinding(value)),
          schema: 2,
        }),
    ],
    [
      'txId',
      (value: ZcashSigningBinding) => {
        const changed = new PaymentTransaction(
          'zcash',
          'bc'.repeat(32),
          value.eventId,
          Buffer.from('01', 'hex'),
          TransactionType.payment,
        ).toJson();
        return encodeZcashSigningBinding({
          ...value,
          txId: 'bc'.repeat(32),
          approvedTxJson: changed,
          approvalEvidence: approval(changed),
        });
      },
    ],
    [
      'eventId',
      (value: ZcashSigningBinding) => {
        const changed = new PaymentTransaction(
          'zcash',
          value.txId,
          'cd'.repeat(32),
          Buffer.from('01', 'hex'),
          TransactionType.payment,
        ).toJson();
        return encodeZcashSigningBinding({
          ...value,
          eventId: 'cd'.repeat(32),
          approvedTxJson: changed,
          approvalEvidence: approval(changed),
        });
      },
    ],
    [
      'approvedTxJson',
      (value: ZcashSigningBinding) => {
        const changed = JSON.stringify({
          ...JSON.parse(value.approvedTxJson),
          txBytes: '03',
        });
        return encodeZcashSigningBinding({
          ...value,
          approvedTxJson: changed,
          approvalEvidence: approval(changed),
        });
      },
    ],
    [
      'approvalEvidence',
      (value: ZcashSigningBinding) =>
        encodeZcashSigningBinding({
          ...value,
          approvalEvidence: approval(value.approvedTxJson, 1, 1_789_900_001),
        }),
    ],
    [
      'requiredSign',
      (value: ZcashSigningBinding) =>
        encodeZcashSigningBinding({
          ...value,
          approvalEvidence: approval(value.approvedTxJson, 2),
          requiredSign: 2,
        }),
    ],
    [
      'genesisHash',
      (value: ZcashSigningBinding) =>
        encodeZcashSigningBinding({ ...value, genesisHash: '01'.repeat(32) }),
    ],
    [
      'outpoint',
      (value: ZcashSigningBinding) =>
        encodeZcashSigningBinding({
          ...value,
          outpoint: `${'02'.repeat(32)}:1`,
        }),
    ],
  ] as const)('rejects a changed binding %s', async (_field, mutate) => {
    const f = await fixture();
    await source
      .getRepository(ZcashSigningAttemptEntity)
      .update({ attemptId: 'attempt-1' }, { bindingJson: mutate(f.binding) });
    await expect(f.store.load(f.txId)).rejects.toThrow(/custody|binding/);
  });

  it.each([
    [
      'sighashAll',
      (value: ZcashSigningBinding) => ({
        ...value,
        sighashAll: '03'.repeat(32),
      }),
    ],
    [
      'tssProfileHash',
      (value: ZcashSigningBinding) => ({
        ...value,
        tssProfileHash: '04'.repeat(32),
      }),
    ],
  ] as const)(
    'rejects persisted valid %s drift after issuing a snapshot',
    async (_field, mutate) => {
      const f = await fixture();
      const snapshot = await f.store.load(f.txId);
      await source
        .getRepository(ZcashSigningAttemptEntity)
        .update(
          { attemptId: 'attempt-1' },
          { bindingJson: encodeZcashSigningBinding(mutate(f.binding)) },
        );
      await expect(f.store.assertCurrent(snapshot)).rejects.toThrow(/custody/);
      await expect(
        f.store.reserveSubmission(snapshot, f.authority),
      ).rejects.toThrow(/custody/);
    },
  );

  it.each([
    'transaction-owner',
    'event-owner',
    'signed-json',
    'missing-attempt',
  ] as const)('rejects broken %s custody', async (kind) => {
    const f = await fixture();
    if (kind === 'transaction-owner')
      await source
        .getRepository(TransactionEntity)
        .update({ txId: f.txId }, { signingAttemptId: null });
    if (kind === 'event-owner')
      await source
        .getRepository(ConfirmedEventEntity)
        .update({ id: f.eventId }, { zcashSigningAttemptId: null });
    if (kind === 'signed-json')
      await source
        .getRepository(TransactionEntity)
        .update({ txId: f.txId }, { txJson: signed(f.binding, '03') });
    if (kind === 'missing-attempt')
      await source
        .getRepository(ZcashSigningAttemptEntity)
        .delete({ attemptId: 'attempt-1' });
    await expect(f.store.load(f.txId)).rejects.toThrow(/custody/);
  });

  it.each(['chain', 'type', 'order', 'status'] as const)(
    'rejects an isolated transaction-row %s drift',
    async (field) => {
      const f = await fixture();
      const repository = source.getRepository(TransactionEntity);
      if (field === 'chain')
        await repository.update({ txId: f.txId }, { chain: 'ergo' });
      if (field === 'type')
        await repository.update(
          { txId: f.txId },
          { type: TransactionType.arbitrary },
        );
      if (field === 'status')
        await repository.update(
          { txId: f.txId },
          { status: TransactionStatus.completed },
        );
      if (field === 'order') {
        await DatabaseAction.getInstance().ArbitraryRepository.insert({
          id: 'order-1',
          chain: 'ergo',
          orderJson: '{}',
          status: 'pending',
          unexpectedFails: 0,
        });
        await source.query(
          `UPDATE "transaction_entity" SET "orderId" = ? WHERE "txId" = ?`,
          ['order-1', f.txId],
        );
      }
      await expect(f.store.load(f.txId)).rejects.toThrow(/custody/);
    },
  );

  it.each(['state', 'eventKey', 'inputKey'] as const)(
    'rejects an isolated signing-attempt %s drift',
    async (field) => {
      const f = await fixture();
      const repository = source.getRepository(ZcashSigningAttemptEntity);
      if (field === 'state')
        await repository.update(
          { attemptId: 'attempt-1' },
          { state: 'may_dispatch' },
        );
      if (field === 'eventKey')
        await repository.update(
          { attemptId: 'attempt-1' },
          { eventKey: `zcash:payment:${'cd'.repeat(32)}` },
        );
      if (field === 'inputKey')
        await repository.update(
          { attemptId: 'attempt-1' },
          { inputKey: `${'11'.repeat(32)}:0` },
        );
      await expect(f.store.load(f.txId)).rejects.toThrow(/custody/);
    },
  );

  it('rejects signing-attempt txId, activeTxId, and relation drift', async () => {
    const f = await fixture();
    const replacementTxId = 'bc'.repeat(32);
    const replacement = new PaymentTransaction(
      'zcash',
      replacementTxId,
      f.eventId,
      Buffer.from('04', 'hex'),
      TransactionType.payment,
    );
    const storedEvent = await DatabaseAction.getInstance().getEventById(
      f.eventId,
    );
    if (!storedEvent) throw Error('event fixture missing');
    await source.getRepository(TransactionEntity).insert({
      txId: replacementTxId,
      txJson: replacement.toJson(),
      approvalEvidence: approval(replacement.toJson()),
      signingAttemptId: null,
      type: TransactionType.payment,
      chain: 'zcash',
      status: TransactionStatus.approved,
      lastCheck: 0,
      event: storedEvent,
      order: null,
      lastStatusUpdate: '',
      failedInSign: false,
      signFailedCount: 0,
      requiredSign: 1,
    });
    // transaction and activeTxId are the same physical FK column; the entity
    // check constraint also requires signed attempt txId === activeTxId.
    await source
      .getRepository(ZcashSigningAttemptEntity)
      .update(
        { attemptId: 'attempt-1' },
        { txId: replacementTxId, activeTxId: replacementTxId },
      );
    await expect(f.store.load(f.txId)).rejects.toThrow(/custody/);
  });

  it('rejects a stale competing snapshot and permits an explicit reload', async () => {
    const f = await fixture();
    const stale = await f.store.load(f.txId);
    const competitor = new ZcashBroadcastStore(source);
    await competitor.markObserved(await competitor.load(f.txId));
    await expect(f.store.assertCurrent(stale)).rejects.toThrow(/custody/);
    await expect(f.store.markObserved(stale)).rejects.toThrow(/custody/);
    expect((await f.store.load(f.txId)).status).toBe(TransactionStatus.sent);
  });

  it('rechecks the locked event after the authority write and rolls back a raced revocation', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    await source.query(
      `CREATE TRIGGER broadcast_race AFTER UPDATE ON "event_trigger_entity"
       BEGIN UPDATE "confirmed_event_entity" SET "status" = '${EventStatus.rejected}' WHERE "id" = '${f.eventId}'; END`,
    );
    try {
      await expect(
        f.store.reserveSubmission(snapshot, f.authority),
      ).rejects.toThrow(/custody/);
    } finally {
      await source.query('DROP TRIGGER broadcast_race');
    }
    expect(
      (await source.getRepository(ConfirmedEventEntity).findOneBy({
        id: f.eventId,
      }))!.status,
    ).toBe(EventStatus.inPayment);
    await f.store.assertCurrent(snapshot);
  });

  it('rejects when the conditional event lock affects no row', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    await source.query(
      `CREATE TRIGGER broadcast_lock_failure BEFORE UPDATE ON "confirmed_event_entity"
       WHEN NEW."zcashSigningAttemptId" = 'attempt-1'
       BEGIN SELECT RAISE(IGNORE); END`,
    );
    try {
      await expect(
        f.store.reserveSubmission(snapshot, f.authority),
      ).rejects.toThrow(/custody/);
    } finally {
      await source.query('DROP TRIGGER broadcast_lock_failure');
    }
    await f.store.assertCurrent(snapshot);
  });

  it('rolls back a coherent binding drift before issuing the sent snapshot', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    const drifted = encodeZcashSigningBinding({
      ...f.binding,
      sighashAll: '03'.repeat(32),
    }).replaceAll("'", "''");
    await source.query(
      `CREATE TRIGGER broadcast_tuple_drift AFTER UPDATE OF "status" ON "transaction_entity"
       WHEN NEW."status" = 'sent'
       BEGIN UPDATE "zcash_signing_attempt_entity" SET "bindingJson" = '${drifted}' WHERE "attemptId" = 'attempt-1'; END`,
    );
    try {
      await expect(f.store.markObserved(snapshot)).rejects.toThrow(/custody/);
    } finally {
      await source.query('DROP TRIGGER broadcast_tuple_drift');
    }
    await f.store.assertCurrent(snapshot);
  });

  it('reloads exact sent custody after closing and reopening a file-backed connection', async () => {
    const f = await fixture();
    await f.store.markObserved(await f.store.load(f.txId));
    const database = join(
      tmpdir(),
      `rosen-zcash-broadcast-${randomUUID()}.sqlite`,
    );
    const options = source.options;
    if (options.type !== 'sqlite') throw Error('SQLite fixture required');
    await source.query(`VACUUM INTO '${database.replaceAll("'", "''")}'`);
    const makeSource = () => new DataSource({ ...options, database });
    let reopened = makeSource();
    try {
      await reopened.initialize();
      const first = await new ZcashBroadcastStore(reopened).load(f.txId);
      expect(first.status).toBe(TransactionStatus.sent);
      expect(first.signedTxJson).toBe(signed(f.binding));
      await reopened.destroy();

      reopened = makeSource();
      await reopened.initialize();
      const restarted = new ZcashBroadcastStore(reopened);
      const resumed = await restarted.load(f.txId);
      expect(resumed).toMatchObject({
        attemptId: 'attempt-1',
        binding: f.binding,
        status: TransactionStatus.sent,
      });
      await restarted.assertCurrent(resumed);
    } finally {
      if (reopened.isInitialized) await reopened.destroy();
      await unlink(database).catch((error: { code?: string }) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  });

  it('rolls back when the final reservation CAS fails', async () => {
    const f = await fixture();
    const snapshot = await f.store.load(f.txId);
    await source.query(
      `CREATE TRIGGER broadcast_failure BEFORE UPDATE ON "transaction_entity"
       WHEN NEW."status" = 'sent' BEGIN SELECT RAISE(ABORT, 'controlled broadcast failure'); END`,
    );
    try {
      await expect(
        f.store.reserveSubmission(snapshot, f.authority),
      ).rejects.toThrow('controlled broadcast failure');
    } finally {
      await source.query('DROP TRIGGER broadcast_failure');
    }
    await f.store.assertCurrent(snapshot);
  });
});
