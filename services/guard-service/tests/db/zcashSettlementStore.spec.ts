import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenTokens } from '@rosen-bridge/tokens';
import {
  EventTrigger,
  PaymentOrder,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import type { ZcashTransactionObservation } from '@rosen-chains/zcash';

import { createTransactionApproval } from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import { ZcashSettlementEntity } from '../../src/db/entities/zcashSettlementEntity';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { ZcashBroadcastStore } from '../../src/db/zcashBroadcastStore';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import {
  encodeZcashSettlementReceipt,
  ZcashConfirmationAuthority,
  type ZcashConfirmedPayment,
} from '../../src/transaction/zcashConfirmationAuthority';
import { ZcashEventRewardAuthority } from '../../src/transaction/zcashEventRewardAuthority';
import type { ZcashSigningBinding } from '../../src/transaction/zcashSigningContext';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/databaseAction.mock';

const source = DatabaseActionMock.testDataSource;
const tokenMap = TokenHandler.getInstance().getTokenMap();
const guardKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const sourceToken = 'cardano-zec';
const genesisHash = 'ee'.repeat(32);
const policy = {
  network: 'testnet' as const,
  genesisHash,
  sourceId: 'zcash-local-test',
  requiredConfirmations: 2,
  maximumAgeMs: 60_000,
};
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
const approval = (approvedTxJson: string): string =>
  createTransactionApproval(approvedTxJson, 1_789_900_000, ['01'.repeat(64)], {
    protocolVersion: '1.0.0',
    guardPublicKeys: [guardKey],
    requiredSign: 1,
  });
const signed = (value: ZcashSigningBinding): string => {
  const payload = JSON.stringify({
    schema: 1,
    intent: {},
    unsignedTxHex: '00',
    authorization: {
      compactSignatureHex: '01',
      compressedPubkeyHex: guardKey,
      signedTxHex: 'aa',
    },
  });
  return new PaymentTransaction(
    'zcash',
    value.txId,
    value.eventId,
    Buffer.from(payload, 'utf8'),
    TransactionType.payment,
  ).toJson();
};

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
  await DatabaseActionMock.insertEventRecord(
    rawEvent,
    EventStatus.inPayment,
    Buffer.from('zcash-event').toString('base64'),
    rawEvent.sourceChainHeight,
  );
  await source.query(
    `UPDATE "event_trigger_entity"
     SET "spendHeight" = NULL, "spendBlock" = NULL, "spendTxId" = NULL,
         "result" = NULL, "paymentTxId" = NULL
     WHERE "eventId" = ?`,
    [eventId],
  );
  const proposed = new PaymentTransaction(
    'zcash',
    txId,
    eventId,
    Buffer.from('01', 'hex'),
    TransactionType.payment,
  );
  const binding: ZcashSigningBinding = {
    schema: 1,
    txId,
    eventId,
    approvedTxJson: proposed.toJson(),
    approvalEvidence: approval(proposed.toJson()),
    requiredSign: 1,
    genesisHash,
    outpoint: `${'ff'.repeat(32)}:0`,
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
  const database = DatabaseAction.getInstance();
  const storedEvent = await database.getEventById(eventId);
  if (!storedEvent) throw Error('event fixture missing');
  await database.insertNewTx(
    proposed,
    storedEvent,
    1,
    null,
    binding.approvalEvidence,
  );
  const attempts = new ZcashSigningAttemptStore(source);
  await attempts.claim('attempt-1', binding);
  await attempts.markMayDispatch('attempt-1', binding);
  await attempts.complete('attempt-1', binding, signed(binding));
  const store = new ZcashBroadcastStore(source);
  const snapshot = await store.markObserved(await store.load(txId));
  const rewardAuthority = await new ZcashEventRewardAuthority(source).capture(
    eventId,
  );
  let observation: ZcashTransactionObservation = Object.freeze({
    kind: 'confirmed',
    txId,
    hex: 'aa',
    blockHash: '44'.repeat(32),
    height: 120,
    confirmations: 3,
  });
  let observe = async (): Promise<ZcashTransactionObservation> => observation;
  let nowMs = 1_789_900_000_000;
  const confirmations = new ZcashConfirmationAuthority(
    {
      validate: () => rewardAuthority.payments,
      observe: () => observe(),
      policy: () => policy,
    },
    () => nowMs,
  );
  const proof = await confirmations.capture(
    {
      txId,
      eventId,
      attemptId: 'attempt-1',
      signedTxJson: snapshot.signedTxJson,
      binding: snapshot.binding,
    },
    rewardAuthority.eventContextJson,
  );
  if (!proof) throw Error('confirmation fixture missing');
  return {
    store,
    snapshot,
    proof,
    rewardAuthority,
    binding,
    txId,
    eventId,
    setObservation: (value: ZcashTransactionObservation) => {
      observation = value;
    },
    setObserve: (value: () => Promise<ZcashTransactionObservation>): void => {
      observe = value;
    },
    setNowMs: (value: number) => {
      nowMs = value;
    },
    captureProof: (
      context = rewardAuthority.eventContextJson,
      payments: PaymentOrder = rewardAuthority.payments,
      attemptId = 'attempt-1',
    ): Promise<ZcashConfirmedPayment | null> =>
      new ZcashConfirmationAuthority(
        {
          validate: () => payments,
          observe: async () => observation,
          policy: () => policy,
        },
        () => nowMs,
      ).capture(
        {
          txId,
          eventId,
          attemptId,
          signedTxJson: snapshot.signedTxJson,
          binding: snapshot.binding,
        },
        context,
      ),
  };
}

describe('atomic Zcash settlement custody', () => {
  it('persists the receipt, completed row, and pending reward event atomically', async () => {
    const f = await fixture();
    const completed = await f.store.settleConfirmed(
      f.snapshot,
      f.proof,
      f.rewardAuthority,
    );
    expect(completed).toMatchObject({
      txId: f.txId,
      status: TransactionStatus.completed,
      settlementJson: f.proof.receiptJson,
    });
    expect(Object.isFrozen(completed)).toBe(true);
    expect(
      await source.getRepository(ZcashSettlementEntity).findOneByOrFail({
        txId: f.txId,
      }),
    ).toMatchObject({
      attemptId: 'attempt-1',
      eventId: f.eventId,
      receiptJson: f.proof.receiptJson,
    });
    expect((await DatabaseAction.getInstance().getTxById(f.txId))!.status).toBe(
      TransactionStatus.completed,
    );
    const event = await DatabaseAction.getInstance().getEventById(f.eventId);
    expect(event).toMatchObject({
      status: EventStatus.pendingReward,
      zcashSigningAttemptId: 'attempt-1',
    });
    expect(event!.firstTry).toMatch(/^[0-9]+$/);
    await f.store.assertCurrent(completed);
  });

  it.each([
    EventStatus.pendingReward,
    EventStatus.inReward,
    EventStatus.rewardWaiting,
    EventStatus.completed,
  ])(
    'replays exactly without regressing forward event status %s',
    async (status) => {
      const f = await fixture();
      await f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority);
      const database = DatabaseAction.getInstance();
      if (status === EventStatus.inReward)
        await database.setEventStatus(f.eventId, EventStatus.inReward);
      if (status === EventStatus.rewardWaiting)
        await database.setEventStatus(f.eventId, EventStatus.rewardWaiting);
      if (status === EventStatus.completed) {
        await database.setEventStatus(f.eventId, EventStatus.inReward);
        await database.setEventStatus(f.eventId, EventStatus.completed);
      }
      const before = await database.getEventById(f.eventId);
      const replayed = await f.store.settleConfirmed(
        f.snapshot,
        f.proof,
        f.rewardAuthority,
      );
      const after = await database.getEventById(f.eventId);
      expect(replayed.status).toBe(TransactionStatus.completed);
      expect(after!.status).toBe(status);
      expect(after!.firstTry).toBe(before!.firstTry);
    },
  );

  it('reloads completed evidence after a file-backed database restart', async () => {
    const f = await fixture();
    await f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority);
    const database = join(
      tmpdir(),
      `rosen-zcash-settlement-${randomUUID()}.sqlite`,
    );
    const options = source.options;
    if (options.type !== 'sqlite') throw Error('SQLite fixture required');
    await source.query(`VACUUM INTO '${database.replaceAll("'", "''")}'`);
    const makeSource = () => new DataSource({ ...options, database });
    let reopened = makeSource();
    try {
      await reopened.initialize();
      expect(
        (await new ZcashBroadcastStore(reopened).load(f.txId)).settlementJson,
      ).toBe(f.proof.receiptJson);
      await reopened.destroy();
      reopened = makeSource();
      await reopened.initialize();
      const completed = await new ZcashBroadcastStore(reopened).load(f.txId);
      expect(completed.status).toBe(TransactionStatus.completed);
      expect(completed.binding).toEqual(f.binding);
    } finally {
      if (reopened.isInitialized) await reopened.destroy();
      await unlink(database).catch((error: { code?: string }) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  });

  it.each([
    'transaction-owner',
    'event-owner',
    'attempt-state',
    'signed-json',
    'event-status',
    'raw-event',
  ] as const)(
    'rejects isolated %s drift without persisting settlement',
    async (kind) => {
      const f = await fixture();
      if (kind === 'transaction-owner')
        await source
          .getRepository(TransactionEntity)
          .update({ txId: f.txId }, { signingAttemptId: null });
      if (kind === 'event-owner')
        await source
          .getRepository(ConfirmedEventEntity)
          .update({ id: f.eventId }, { zcashSigningAttemptId: null });
      if (kind === 'attempt-state')
        await source
          .getRepository(ZcashSigningAttemptEntity)
          .update({ attemptId: 'attempt-1' }, { state: 'may_dispatch' });
      if (kind === 'signed-json')
        await source
          .getRepository(TransactionEntity)
          .update({ txId: f.txId }, { txJson: f.binding.approvedTxJson });
      if (kind === 'event-status')
        await source
          .getRepository(ConfirmedEventEntity)
          .update({ id: f.eventId }, { status: EventStatus.rejected });
      if (kind === 'raw-event')
        await source.query(
          `UPDATE "event_trigger_entity" SET "spendBlock" = 'spent'
           WHERE "eventId" = ?`,
          [f.eventId],
        );
      await expect(
        f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority),
      ).rejects.toThrow();
      expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    },
  );

  it.each(['expired', 'reorged'] as const)(
    'rechecks that confirmation remains %s before commit',
    async (kind) => {
      const f = await fixture();
      if (kind === 'expired')
        f.setNowMs(
          f.proof.receipt.observedAtMs + f.proof.receipt.maximumAgeMs + 1,
        );
      else
        f.setObservation(
          Object.freeze({
            kind: 'confirmed',
            txId: f.txId,
            hex: 'aa',
            blockHash: '55'.repeat(32),
            height: 120,
            confirmations: 3,
          }),
        );
      await expect(
        f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority),
      ).rejects.toThrow(/confirmation/i);
      expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
      expect(
        (
          await source.getRepository(TransactionEntity).findOneByOrFail({
            txId: f.txId,
          })
        ).status,
      ).toBe(TransactionStatus.sent);
      expect(
        (await DatabaseAction.getInstance().getEventById(f.eventId))!.status,
      ).toBe(EventStatus.inPayment);
    },
  );

  it('rolls back when the raw trigger changes during confirmation revalidation', async () => {
    const f = await fixture();
    f.setObserve(async () => {
      await source.query(
        `UPDATE "event_trigger_entity" SET "spendBlock" = 'spent'
         WHERE "eventId" = ?`,
        [f.eventId],
      );
      return Object.freeze({
        kind: 'confirmed',
        txId: f.txId,
        hex: 'aa',
        blockHash: '44'.repeat(32),
        height: 120,
        confirmations: 3,
      });
    });
    await expect(
      f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority),
    ).rejects.toThrow(/reward authority/i);
    expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    expect(
      (
        await source.getRepository(TransactionEntity).findOneByOrFail({
          txId: f.txId,
        })
      ).status,
    ).toBe(TransactionStatus.sent);
    expect(
      (await DatabaseAction.getInstance().getEventById(f.eventId))!.status,
    ).toBe(EventStatus.inPayment);
  });

  it.each(['attempt', 'context', 'payments'] as const)(
    'rejects issued confirmation %s mismatch',
    async (kind) => {
      const f = await fixture();
      const differentPayments = Object.freeze([
        Object.freeze({
          address: 'different',
          assets: Object.freeze({
            nativeToken: 1n,
            tokens: Object.freeze([]),
          }),
        }),
      ]) as unknown as PaymentOrder;
      const proof = await f.captureProof(
        kind === 'context' ? '{"schema":1}' : undefined,
        kind === 'payments' ? differentPayments : undefined,
        kind === 'attempt' ? 'attempt-2' : undefined,
      );
      if (!proof) throw Error('mismatch proof missing');
      await expect(
        f.store.settleConfirmed(f.snapshot, proof, f.rewardAuthority),
      ).rejects.toThrow();
      expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    },
  );

  it('rejects a below-threshold receipt in the canonical codec', async () => {
    const f = await fixture();
    expect(() =>
      encodeZcashSettlementReceipt({
        ...f.proof.receipt,
        confirmations: f.proof.receipt.requiredConfirmations - 1,
      }),
    ).toThrow(/receipt fields/);
  });

  it.each(['receipt', 'transaction', 'event', 'final-read'] as const)(
    'rolls back every write when %s fails',
    async (phase) => {
      const f = await fixture();
      const trigger = `settlement_failure_${phase.replace('-', '_')}`;
      const sql =
        phase === 'receipt'
          ? `CREATE TRIGGER ${trigger} BEFORE INSERT ON "zcash_settlement_entity"
             BEGIN SELECT RAISE(ABORT, 'controlled receipt failure'); END`
          : phase === 'transaction'
            ? `CREATE TRIGGER ${trigger} BEFORE UPDATE ON "transaction_entity"
               WHEN NEW."status" = 'completed'
               BEGIN SELECT RAISE(ABORT, 'controlled transaction failure'); END`
            : phase === 'event'
              ? `CREATE TRIGGER ${trigger} BEFORE UPDATE ON "confirmed_event_entity"
                 WHEN NEW."status" = 'pending-reward'
                 BEGIN SELECT RAISE(ABORT, 'controlled event failure'); END`
              : `CREATE TRIGGER ${trigger} AFTER UPDATE ON "confirmed_event_entity"
                 WHEN NEW."status" = 'pending-reward'
                 BEGIN UPDATE "transaction_entity" SET "approvalEvidence" = NULL
                 WHERE "txId" = '${f.txId}'; END`;
      await source.query(sql);
      try {
        await expect(
          f.store.settleConfirmed(f.snapshot, f.proof, f.rewardAuthority),
        ).rejects.toThrow();
      } finally {
        await source.query(`DROP TRIGGER ${trigger}`);
      }
      expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
      expect(
        (await DatabaseAction.getInstance().getTxById(f.txId))!.status,
      ).toBe(TransactionStatus.sent);
      expect(
        (await DatabaseAction.getInstance().getEventById(f.eventId))!.status,
      ).toBe(EventStatus.inPayment);
      await f.store.assertCurrent(f.snapshot);
    },
  );
});
