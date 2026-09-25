import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { createTransactionApproval } from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import { ZcashSigningBinding } from '../../src/transaction/zcashSigningContext';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/databaseAction.mock';

// Storage-only certificate fixtures; cryptographic replay is covered by the
// coordinator tests. These cases target the actual generic database writers.
const db = () => DatabaseAction.getInstance();
const proof = (tx: PaymentTransaction) =>
  createTransactionApproval(tx.toJson(), 1700000000, ['11'.repeat(64)], {
    protocolVersion: '1.0.0',
    requiredSign: 1,
    guardPublicKeys: [
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    ],
  });
async function fixture(claim = true) {
  const tx = new PaymentTransaction(
    'zcash',
    'bb'.repeat(32),
    'cd'.repeat(32),
    Buffer.from('approved'),
    TransactionType.payment,
  );
  const next = new PaymentTransaction(
    'zcash',
    'aa'.repeat(32),
    tx.eventId,
    Buffer.from('replacement'),
    TransactionType.payment,
  );
  const signed = new PaymentTransaction(
    'zcash',
    tx.txId,
    tx.eventId,
    Buffer.from('signed'),
    TransactionType.payment,
  );
  await db().ConfirmedEventRepository.insert({
    id: tx.eventId,
    status: EventStatus.inPayment,
    unexpectedFails: 0,
  });
  const event = await db().ConfirmedEventRepository.findOneByOrFail({
    id: tx.eventId,
  });
  await db().insertNewTx(tx, event, 1, null, proof(tx));
  const binding: ZcashSigningBinding = {
    schema: 1,
    txId: tx.txId,
    eventId: tx.eventId,
    approvedTxJson: tx.toJson(),
    approvalEvidence: proof(tx),
    requiredSign: 1,
    genesisHash: 'ee'.repeat(32),
    outpoint: 'ff'.repeat(32) + ':0',
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
  const store = new ZcashSigningAttemptStore(db().dataSource);
  if (claim) await store.claim('attempt-a', binding);
  return { tx, next, signed, event, binding, store };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  await DatabaseActionMock.clearTables();
});

describe('generic writer fences for Zcash custody', () => {
  const writers: Array<[string, (f: Fixture) => Promise<void>]> = [
    [
      'status approved',
      (f) => db().setTxStatus(f.tx.txId, TransactionStatus.approved),
    ],
    [
      'status invalid',
      (f) => db().setTxStatus(f.tx.txId, TransactionStatus.invalid),
    ],
    [
      'status signed',
      (f) => db().setTxStatus(f.tx.txId, TransactionStatus.signed),
    ],
    ['status sent', (f) => db().setTxStatus(f.tx.txId, TransactionStatus.sent)],
    ['sign failure', (f) => db().setTxAsSignFailed(f.tx.txId)],
    [
      'signed JSON',
      (f) => db().updateWithSignedTx(f.tx.txId, f.signed.toJson(), 100),
    ],
    ['failure reset', (f) => db().resetFailedInSign(f.tx.txId)],
    ['last check', (f) => db().updateTxLastCheck(f.tx.txId, 100)],
    ['threshold', (f) => db().updateRequiredSign(f.tx.txId, 2)],
    ['replacement', (f) => db().replaceTx(f.tx.txId, f.next, 1, proof(f.next))],
    [
      'new proposal',
      (f) => db().insertNewTx(f.next, f.event, 1, null, proof(f.next)),
    ],
    [
      'completed proposal',
      (f) => db().insertCompletedTx(f.next, f.event, 1, null),
    ],
    [
      'event pending payment',
      (f) => db().setEventStatus(f.tx.eventId, EventStatus.pendingPayment),
    ],
    [
      'event in payment',
      (f) => db().setEventStatus(f.tx.eventId, EventStatus.inPayment),
    ],
    [
      'event pending reward',
      (f) => db().setEventStatus(f.tx.eventId, EventStatus.pendingReward),
    ],
    [
      'event in reward',
      (f) => db().setEventStatus(f.tx.eventId, EventStatus.inReward),
    ],
    [
      'event completed',
      (f) => db().setEventStatus(f.tx.eventId, EventStatus.completed),
    ],
    [
      'event pending with timestamp',
      (f) =>
        db().setEventStatusToPending(f.tx.eventId, EventStatus.pendingPayment),
    ],
  ];
  it.each(writers)(
    'blocks %s while prepared without changing custody',
    async (_name, write) => {
      const f = await fixture();
      await expect(write(f)).rejects.toThrow();
      const row = (await db().getTxById(f.tx.txId))!;
      expect(row).toMatchObject({
        txJson: f.tx.toJson(),
        status: TransactionStatus.inSign,
        signingAttemptId: 'attempt-a',
        requiredSign: 1,
      });
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('prepared');
      expect(
        (await db().getEventById(f.tx.eventId))!.zcashSigningAttemptId,
      ).toBe('attempt-a');
      expect(await db().getTxById(f.next.txId)).toBeNull();
    },
  );

  it('same reapproval and threshold are true no-write operations while owned', async () => {
    const f = await fixture();
    await db().TransactionRepository.update(
      { txId: f.tx.txId },
      { failedInSign: true },
    );
    const previous = (await db().getTxById(f.tx.txId))!;
    await db().reinsertTxApproval(previous, f.tx, 1, proof(f.tx));
    await db().updateRequiredSign(f.tx.txId, 1);
    expect((await db().getTxById(f.tx.txId))!).toEqual(previous);
  });

  it('rejects generic completion of an exact owned signed Zcash row', async () => {
    const f = await fixture();
    await f.store.markMayDispatch('attempt-a', f.binding);
    await f.store.complete('attempt-a', f.binding, f.signed.toJson());
    await db().setTxStatus(f.tx.txId, TransactionStatus.sent);
    await expect(
      db().setTxStatus(f.tx.txId, TransactionStatus.completed),
    ).rejects.toThrow(/custody or state/);
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.sent,
    );
  });

  it('rejects generic completed Zcash insertion without historical proof', async () => {
    const f = await fixture(false);
    await expect(
      db().insertCompletedTx(f.next, f.event, 1, null),
    ).rejects.toThrow(/confirmed settlement proof/);
    expect(await db().getTxById(f.next.txId)).toBeNull();
  });

  it.each([
    EventStatus.pendingReward,
    EventStatus.inReward,
    EventStatus.rewardWaiting,
    EventStatus.completed,
  ])(
    'rejects owned event transition to %s without settlement',
    async (status) => {
      const f = await fixture();
      await f.store.markMayDispatch('attempt-a', f.binding);
      await f.store.complete('attempt-a', f.binding, f.signed.toJson());
      await db().TransactionRepository.update(
        { txId: f.tx.txId },
        { status: TransactionStatus.completed },
      );
      if (status !== EventStatus.pendingReward)
        await db().ConfirmedEventRepository.update(
          { id: f.tx.eventId },
          { status: EventStatus.pendingReward },
        );
      await expect(db().setEventStatus(f.tx.eventId, status)).rejects.toThrow(
        /signing custody/,
      );
    },
  );

  for (const action of ['sent', 'completed', 'height'] as const)
    it(`refuses ${action} when stored signed bytes no longer match attempt`, async () => {
      const f = await fixture();
      await f.store.markMayDispatch('attempt-a', f.binding);
      await f.store.complete('attempt-a', f.binding, f.signed.toJson());
      if (action === 'completed')
        await db().setTxStatus(f.tx.txId, TransactionStatus.sent);
      await db().TransactionRepository.update(
        { txId: f.tx.txId },
        { txJson: f.tx.toJson() },
      );
      await expect(
        action === 'height'
          ? db().updateTxLastCheck(f.tx.txId, 999)
          : db().setTxStatus(f.tx.txId, action),
      ).rejects.toThrow(/custody or state/);
      expect((await f.store.getActive(f.tx.txId))!.signedJson).toBe(
        f.signed.toJson(),
      );
    });

  it.each(['claim-first', 'writer-first'])(
    'serializes same-connection claim and invalidation %s',
    async (order) => {
      const f = await fixture(false);
      const claim = () => f.store.claim('attempt-a', f.binding);
      const write = () =>
        db().setTxStatus(f.tx.txId, TransactionStatus.invalid);
      const outcomes = await Promise.allSettled(
        order === 'claim-first' ? [claim(), write()] : [write(), claim()],
      );
      expect(outcomes.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
      const row = (await db().getTxById(f.tx.txId))!;
      if (order === 'claim-first')
        expect(row.signingAttemptId).toBe('attempt-a');
      else {
        expect(row.status).toBe(TransactionStatus.invalid);
        expect(row.signingAttemptId).toBeNull();
        expect(await f.store.getActive(f.tx.txId)).toBeNull();
        expect(
          (
            await db()
              .dataSource.getRepository(ConfirmedEventEntity)
              .findOneByOrFail({ id: f.tx.eventId })
          ).zcashSigningAttemptId,
        ).toBeNull();
      }
    },
  );
});
