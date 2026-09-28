import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { DatabaseAction } from '../../src/db/databaseAction';
import DatabaseHandler from '../../src/db/databaseHandler';
import { Migration1789900000000 } from '../../src/db/migrations/sqlite/1789900000000-migration';
import EventSerializer from '../../src/event/eventSerializer';
import PublicStatusHandler from '../../src/handlers/publicStatusHandler';
import * as TransactionSerializer from '../../src/transaction/transactionSerializer';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../../src/utils/constants';
import * as EventTestData from '../event/testData';
import DatabaseActionMock from './mocked/databaseAction.mock';

const publicKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const otherKey =
  '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
function transaction(id = 'bb'.repeat(32), metadata = '11'.repeat(32)) {
  return new PaymentTransaction(
    'zcash',
    id,
    metadata,
    Buffer.from('unsigned proposal'),
    TransactionType.coldStorage,
  );
}
// These structurally valid certificates exercise storage only; the producer owns cryptographic verification.
function evidence(
  tx: PaymentTransaction,
  changes: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    schema: 1,
    approvedTxJson: tx.toJson(),
    txDataHash: TransactionSerializer.getTxDataHash(tx),
    timestamp: 1789900000,
    protocolVersion: '1.0.0',
    guardPublicKeys: [publicKey, otherKey],
    signatures: ['11'.repeat(64), ''],
    requiredSign: 1,
    ...changes,
  });
}
const db = () => DatabaseAction.getInstance();
const row = (id: string) =>
  db().TransactionRepository.findOneByOrFail({ txId: id });

describe('approval evidence persistence', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  for (const [type, relation] of [
    [TransactionType.payment, 'none'],
    [TransactionType.payment, 'order'],
    [TransactionType.payment, 'both'],
    [TransactionType.reward, 'none'],
    [TransactionType.reward, 'order'],
    [TransactionType.reward, 'both'],
    [TransactionType.arbitrary, 'none'],
    [TransactionType.arbitrary, 'event'],
    [TransactionType.arbitrary, 'both'],
    [TransactionType.coldStorage, 'event'],
    [TransactionType.coldStorage, 'order'],
    [TransactionType.coldStorage, 'both'],
    [TransactionType.manual, 'event'],
    [TransactionType.manual, 'order'],
    [TransactionType.manual, 'both'],
  ] as const) {
    it(`rejects certified relation shape ${type}/${relation}`, async () => {
      const event = EventTestData.mockEventTrigger().event;
      event.toChain = 'zcash';
      const id = EventSerializer.getId(event);
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.pendingPayment,
      );
      await DatabaseActionMock.insertOrderRecord(
        id,
        'zcash',
        '{}',
        OrderStatus.pending,
      );
      const eventRecord = await db().getEventById(id),
        orderRecord = await db().getOrderById(id);
      expect(eventRecord).not.toBeNull();
      expect(orderRecord).not.toBeNull();
      const tx = new PaymentTransaction(
        'zcash',
        'bb'.repeat(32),
        id,
        Buffer.from('proposal'),
        type,
      );
      await expect(
        db().insertNewTx(
          tx,
          relation === 'event' || relation === 'both' ? eventRecord : null,
          1,
          relation === 'order' || relation === 'both' ? orderRecord : null,
          evidence(tx),
        ),
      ).rejects.toThrow('relation shape');
      expect(await db().TransactionRepository.count()).toBe(0);
    });
  }

  for (const type of [TransactionType.lock, 'unknown' as TransactionType]) {
    it(`rejects unsupported certified transaction type ${type}`, async () => {
      const tx = new PaymentTransaction(
        'zcash',
        'bb'.repeat(32),
        '11'.repeat(32),
        Buffer.from('proposal'),
        type,
      );
      await expect(
        db().insertNewTx(tx, null, 1, null, evidence(tx)),
      ).rejects.toThrow('unsupported transaction type');
      expect(await db().TransactionRepository.count()).toBe(0);
    });
  }

  for (const type of [
    TransactionType.payment,
    TransactionType.reward,
    TransactionType.arbitrary,
    TransactionType.coldStorage,
    TransactionType.manual,
  ]) {
    it(`accepts the required certified relation shape for ${type}`, async () => {
      const event = EventTestData.mockEventTrigger().event;
      event.toChain = 'zcash';
      const id = EventSerializer.getId(event);
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.pendingPayment,
      );
      await DatabaseActionMock.insertOrderRecord(
        id,
        'zcash',
        '{}',
        OrderStatus.pending,
      );
      const eventRecord = await db().getEventById(id),
        orderRecord = await db().getOrderById(id);
      expect(eventRecord).not.toBeNull();
      expect(orderRecord).not.toBeNull();
      const tx = new PaymentTransaction(
        'zcash',
        'bb'.repeat(32),
        id,
        Buffer.from('proposal'),
        type,
      );
      const approval = evidence(tx);
      await db().insertNewTx(
        tx,
        type === TransactionType.payment || type === TransactionType.reward
          ? eventRecord
          : null,
        1,
        type === TransactionType.arbitrary ? orderRecord : null,
        approval,
      );
      expect((await row(tx.txId)).approvalEvidence).toBe(approval);
    });
  }

  it('actual SQLite up migration preserves a pre-existing legacy row with NULL evidence', async () => {
    const options = DatabaseActionMock.testDataSource.options;
    if (options.type !== 'sqlite') throw Error('SQLite fixture required');
    const migrations = options.migrations;
    if (!Array.isArray(migrations)) throw Error('Migration array required');
    const legacy = new DataSource({
      ...options,
      database: ':memory:',
      migrations: migrations.filter(
        (migration) => migration !== Migration1789900000000,
      ),
    });
    await legacy.initialize();
    const runner = legacy.createQueryRunner();
    try {
      await legacy.runMigrations();
      const tx = transaction();
      await legacy.query(
        'INSERT INTO "transaction_entity" ("txId", "txJson", "type", "chain", "status", "lastCheck", "lastStatusUpdate", "failedInSign", "signFailedCount", "requiredSign") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          tx.txId,
          tx.toJson(),
          tx.txType,
          tx.network,
          TransactionStatus.approved,
          17,
          '123',
          1,
          3,
          2,
        ],
      );
      const before = await legacy.query('SELECT * FROM "transaction_entity"');
      expect(Object.hasOwn(before[0], 'approvalEvidence')).toBe(false);
      await new Migration1789900000000().up(runner);
      const after = await legacy.query('SELECT * FROM "transaction_entity"');
      expect(after).toEqual([{ ...before[0], approvalEvidence: null }]);
    } finally {
      await runner.release();
      await legacy.destroy();
    }
  });

  it('inserts proposal, threshold and certificate in one approved row; legacy remains NULL', async () => {
    const tx = transaction(),
      approval = evidence(tx);
    await DatabaseHandler.insertTx(tx, 1, false, approval);
    expect(await row(tx.txId)).toMatchObject({
      txJson: tx.toJson(),
      requiredSign: 1,
      approvalEvidence: approval,
      status: TransactionStatus.approved,
    });
    const legacy = transaction('cc'.repeat(32));
    await db().insertNewTx(legacy, null, 2, null);
    expect((await row(legacy.txId)).approvalEvidence).toBeNull();
  });

  it('rejects mismatched proposal and threshold before inserting any row', async () => {
    const tx = transaction();
    await expect(
      db().insertNewTx(tx, null, 2, null, evidence(tx)),
    ).rejects.toThrow();
    await expect(
      db().insertNewTx(
        tx,
        null,
        1,
        null,
        evidence(transaction('cc'.repeat(32))),
      ),
    ).rejects.toThrow();
    expect(await db().TransactionRepository.count()).toBe(0);
  });

  for (const field of ['txId', 'network', 'txType', 'eventId'] as const) {
    it(`rejects a model whose ${field} differs from its certified JSON`, async () => {
      const tx = transaction(),
        approvedJson = tx.toJson(),
        approval = evidence(tx);
      tx.toJson = () => approvedJson;
      Object.assign(tx, {
        [field]: field === 'txType' ? TransactionType.manual : 'cc'.repeat(32),
      });
      await expect(
        db().insertNewTx(tx, null, 1, null, approval),
      ).rejects.toThrow('identity');
      expect(await db().TransactionRepository.count()).toBe(0);
    });
  }

  it('rejects an event relation different from the approved eventId', async () => {
    const event = EventTestData.mockEventTrigger().event;
    await DatabaseActionMock.insertEventRecord(
      event,
      EventStatus.pendingPayment,
    );
    const relation = await db().getEventById(EventSerializer.getId(event));
    expect(relation).not.toBeNull();
    const tx = transaction();
    tx.txType = TransactionType.payment;
    await expect(
      db().insertNewTx(tx, relation, 1, null, evidence(tx)),
    ).rejects.toThrow('relation differs');
    expect(await db().TransactionRepository.count()).toBe(0);
  });

  it('rejects an order relation different from the approved eventId', async () => {
    const id = 'cc'.repeat(32);
    await DatabaseActionMock.insertOrderRecord(
      id,
      'zcash',
      '{}',
      OrderStatus.pending,
    );
    const relation = await db().getOrderById(id);
    expect(relation).not.toBeNull();
    const tx = transaction();
    tx.txType = TransactionType.arbitrary;
    await expect(
      db().insertNewTx(tx, null, 1, relation, evidence(tx)),
    ).rejects.toThrow('relation differs');
    expect(await db().TransactionRepository.count()).toBe(0);
  });

  it('preserves the original certificate after signed JSON overwrite and identical-policy reapproval', async () => {
    const tx = transaction(),
      approval = evidence(tx);
    await DatabaseHandler.insertTx(tx, 1, false, approval);
    await db().updateWithSignedTx(tx.txId, '{"signed":true}', 100);
    await db().TransactionRepository.update(
      { txId: tx.txId },
      { failedInSign: true, signFailedCount: 3 },
    );
    await DatabaseHandler.insertTx(
      tx,
      1,
      false,
      evidence(tx, {
        timestamp: 1789900001,
        signatures: ['', '22'.repeat(64)],
      }),
    );
    expect(await row(tx.txId)).toMatchObject({
      txJson: '{"signed":true}',
      approvalEvidence: approval,
      requiredSign: 1,
      status: TransactionStatus.signed,
      failedInSign: false,
      signFailedCount: 3,
    });
  });

  it('rejects same-id changed metadata, changed membership, changed threshold, and omitted certificate', async () => {
    const tx = transaction(),
      approval = evidence(tx);
    await DatabaseHandler.insertTx(tx, 1, false, approval);
    const altered = transaction(tx.txId, '22'.repeat(32));
    await expect(
      DatabaseHandler.insertTx(altered, 1, false, evidence(altered)),
    ).rejects.toThrow();
    await expect(
      DatabaseHandler.insertTx(
        tx,
        1,
        false,
        evidence(tx, { guardPublicKeys: [otherKey, publicKey] }),
      ),
    ).rejects.toThrow();
    await expect(
      DatabaseHandler.insertTx(
        tx,
        2,
        false,
        evidence(tx, {
          requiredSign: 2,
          signatures: ['11'.repeat(64), '22'.repeat(64)],
        }),
      ),
    ).rejects.toThrow();
    await expect(DatabaseHandler.insertTx(tx, 1)).rejects.toThrow();
    expect((await row(tx.txId)).approvalEvidence).toBe(approval);
  });

  it('rejects implicit certificate upgrade of a legacy same-id row', async () => {
    const tx = transaction();
    await DatabaseHandler.insertTx(tx, 1);
    await expect(
      DatabaseHandler.insertTx(tx, 1, false, evidence(tx)),
    ).rejects.toThrow();
    expect((await row(tx.txId)).approvalEvidence).toBeNull();
  });

  it('atomically replaces an approved proposal with its new threshold and certificate', async () => {
    const old = transaction(),
      next = transaction('aa'.repeat(32));
    await db().insertNewTx(old, null, 1, null, evidence(old));
    const approval = evidence(next, {
      requiredSign: 2,
      signatures: ['11'.repeat(64), '22'.repeat(64)],
    });
    await db().replaceTx(old.txId, next, 2, approval);
    expect(await db().getTxById(old.txId)).toBeNull();
    expect(await row(next.txId)).toMatchObject({
      txJson: next.toJson(),
      requiredSign: 2,
      approvalEvidence: approval,
      status: TransactionStatus.approved,
    });
  });

  it('threads evidence and threshold through the actual event-payment lower-id replacement path', async () => {
    const event = EventTestData.mockEventTrigger().event;
    event.toChain = 'zcash';
    const eventId = EventSerializer.getId(event);
    await DatabaseActionMock.insertEventRecord(
      event,
      EventStatus.pendingPayment,
    );
    const old = new PaymentTransaction(
      'zcash',
      'bb'.repeat(32),
      eventId,
      Buffer.from('old'),
      TransactionType.payment,
    );
    const next = new PaymentTransaction(
      'zcash',
      'aa'.repeat(32),
      eventId,
      Buffer.from('new'),
      TransactionType.payment,
    );
    await DatabaseHandler.insertTx(old, 1, false, evidence(old));
    const approval = evidence(next, {
      requiredSign: 2,
      signatures: ['11'.repeat(64), '22'.repeat(64)],
    });
    await DatabaseHandler.insertTx(next, 2, false, approval);
    expect(await db().getTxById(old.txId)).toBeNull();
    expect(await row(next.txId)).toMatchObject({
      requiredSign: 2,
      approvalEvidence: approval,
      txJson: next.toJson(),
    });
    expect((await db().getTxById(next.txId))?.event?.id).toBe(eventId);
  });

  it('writes the captured proposal and identity when the caller mutates its model during the prior-row read', async () => {
    const old = transaction(),
      next = transaction('aa'.repeat(32));
    await db().insertNewTx(old, null, 1, null, evidence(old));
    const capturedJson = next.toJson(),
      capturedId = next.txId,
      approval = evidence(next);
    const originalRead = db().getTxById;
    const read = vi
      .spyOn(db(), 'getTxById')
      .mockImplementationOnce(async (id) => {
        const previous = await originalRead(id);
        next.txId = 'cc'.repeat(32);
        next.network = 'other';
        next.txType = TransactionType.manual;
        next.txBytes = Buffer.from('mutated');
        return previous;
      });
    try {
      await db().replaceTx(old.txId, next, 1, approval);
    } finally {
      read.mockRestore();
    }
    expect(await row(capturedId)).toMatchObject({
      txJson: capturedJson,
      chain: 'zcash',
      type: TransactionType.coldStorage,
      approvalEvidence: approval,
    });
    expect(await db().getTxById(next.txId)).toBeNull();
  });

  it('refuses certificate stripping and replacement of an advanced row', async () => {
    const old = transaction(),
      next = transaction('aa'.repeat(32));
    await db().insertNewTx(old, null, 1, null, evidence(old));
    await expect(db().replaceTx(old.txId, next, 1)).rejects.toThrow();
    await db().setTxStatus(old.txId, TransactionStatus.inSign);
    await expect(
      db().replaceTx(old.txId, next, 1, evidence(next)),
    ).rejects.toThrow();
    expect((await row(old.txId)).status).toBe(TransactionStatus.inSign);
  });

  it('protects certificate threshold from the legacy manual overwrite API', async () => {
    const tx = transaction();
    await db().insertNewTx(tx, null, 1, null, evidence(tx));
    await expect(db().updateRequiredSign(tx.txId, 2)).rejects.toThrow();
    await db().updateRequiredSign(tx.txId, 1);
    expect((await row(tx.txId)).requiredSign).toBe(1);
  });

  for (const field of [
    'txId',
    'status',
    'txJson',
    'requiredSign',
    'approvalEvidence',
  ] as const) {
    it(`rejects replacement when the observed ${field} changes before its write`, async () => {
      const old = transaction(),
        next = transaction('aa'.repeat(32));
      await db().insertNewTx(old, null, 1, null, evidence(old));
      const repository = db().TransactionRepository;
      const originalRead = db().getTxById.bind(db());
      const changes = {
        txId: 'cc'.repeat(32),
        status: TransactionStatus.inSign,
        txJson: '{"concurrent":true}',
        requiredSign: 2,
        approvalEvidence: evidence(old, { timestamp: 1789900001 }),
      };
      const notify = vi.spyOn(
        PublicStatusHandler.getInstance(),
        'updatePublicTxStatus',
      );
      const read = vi
        .spyOn(db(), 'getTxById')
        .mockImplementationOnce(async (txId) => {
          const observed = await originalRead(txId);
          await repository.update(
            { txId: old.txId },
            { [field]: changes[field] },
          );
          return observed;
        });
      try {
        await expect(
          db().replaceTx(old.txId, next, 1, evidence(next)),
        ).rejects.toThrow('row changed');
        expect(read).toHaveBeenCalledOnce();
        expect(notify).not.toHaveBeenCalled();
      } finally {
        read.mockRestore();
        notify.mockRestore();
      }
      expect(await db().getTxById(next.txId)).toBeNull();
      expect(
        await row(field === 'txId' ? changes.txId : old.txId),
      ).toHaveProperty(field, changes[field]);
    });
  }

  it('rejects stale same-proposal reinsertion without clearing failure state', async () => {
    const tx = transaction();
    await db().insertNewTx(tx, null, 1, null, evidence(tx));
    const previous = await row(tx.txId);
    await db().TransactionRepository.update(
      { txId: tx.txId },
      { status: TransactionStatus.inSign, failedInSign: true },
    );
    await expect(
      db().reinsertTxApproval(previous, tx, 1, evidence(tx)),
    ).rejects.toThrow('row changed');
    expect(await row(tx.txId)).toMatchObject({
      status: TransactionStatus.inSign,
      failedInSign: true,
    });
  });

  it('rolls back the entire replacement when SQLite rejects its write', async () => {
    const old = transaction(),
      next = transaction('aa'.repeat(32)),
      approval = evidence(old);
    await db().insertNewTx(old, null, 1, null, approval);
    await db().dataSource.query(
      `CREATE TRIGGER reject_approval_replacement BEFORE UPDATE ON transaction_entity BEGIN SELECT RAISE(ABORT, 'controlled rejection'); END`,
    );
    try {
      await expect(
        db().replaceTx(
          old.txId,
          next,
          2,
          evidence(next, {
            requiredSign: 2,
            signatures: ['11'.repeat(64), '22'.repeat(64)],
          }),
        ),
      ).rejects.toThrow('controlled rejection');
    } finally {
      await db().dataSource.query('DROP TRIGGER reject_approval_replacement');
    }
    expect(await row(old.txId)).toMatchObject({
      txJson: old.toJson(),
      requiredSign: 1,
      approvalEvidence: approval,
    });
    expect(await db().getTxById(next.txId)).toBeNull();
  });
});
