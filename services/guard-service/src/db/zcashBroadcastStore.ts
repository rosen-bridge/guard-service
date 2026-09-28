import { isEqual } from 'lodash-es';
import { createHash } from 'node:crypto';

import {
  DataSource,
  EntityManager,
  IsNull,
} from '@rosen-bridge/extended-typeorm';
import { TransactionType } from '@rosen-chains/abstract-chain';

import {
  assertZcashConfirmedPayment,
  decodeZcashSettlementReceipt,
  type ZcashConfirmedPayment,
} from '../transaction/zcashConfirmationAuthority';
import {
  assertZcashEventPaymentSnapshot,
  type ZcashEventPaymentSnapshot,
} from '../transaction/zcashEventPaymentAuthority';
import {
  assertZcashEventRewardSnapshot,
  type ZcashEventRewardSnapshot,
} from '../transaction/zcashEventRewardAuthority';
import {
  assertZcashPaymentIdentity,
  decodeZcashSigningBinding,
  encodeZcashSigningBinding,
  type ZcashSigningBinding,
} from '../transaction/zcashSigningContext';
import {
  assertZcashSpentEventRecoverySnapshot,
  type ZcashSpentEventRecoverySnapshot,
} from '../transaction/zcashSpentEventRecoveryAuthority';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { TransactionEntity } from './entities/transactionEntity';
import { ZcashSettlementEntity } from './entities/zcashSettlementEntity';
import { ZcashSigningAttemptEntity } from './entities/zcashSigningAttemptEntity';
import { withZcashSigningTransaction } from './zcashSigningAttemptStore';

export interface ZcashBroadcastSnapshot {
  readonly txId: string;
  readonly eventId: string;
  readonly attemptId: string;
  readonly signedTxJson: string;
  readonly binding: ZcashSigningBinding;
  readonly status: 'signed' | 'sent' | 'completed';
  readonly settlementJson: string | null;
}

export interface ZcashObservedSigningRecoverySnapshot {
  readonly txId: string;
  readonly eventId: string;
  readonly attemptId: string;
  readonly approvedTxJson: string;
  readonly binding: ZcashSigningBinding;
}

type SnapshotData = ZcashBroadcastSnapshot;

const fail = (): never => {
  throw Error('Zcash broadcast custody conflict');
};

const txId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail();
  return value as string;
};

const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const fingerprint = (value: SnapshotData): string =>
  JSON.stringify({
    txId: value.txId,
    eventId: value.eventId,
    attemptId: value.attemptId,
    signedTxJson: value.signedTxJson,
    bindingJson: encodeZcashSigningBinding(value.binding),
    status: value.status,
    settlementJson: value.settlementJson,
  });

const recoveryFingerprint = (
  value: ZcashObservedSigningRecoverySnapshot,
): string =>
  JSON.stringify({
    txId: value.txId,
    eventId: value.eventId,
    attemptId: value.attemptId,
    approvedTxJson: value.approvedTxJson,
    bindingJson: encodeZcashSigningBinding(value.binding),
  });

export class ZcashBroadcastStore {
  private readonly issued = new WeakSet<object>();
  private readonly fingerprints = new WeakMap<object, string>();
  private readonly recoveryIssued = new WeakSet<object>();
  private readonly recoveryFingerprints = new WeakMap<object, string>();

  constructor(private readonly dataSource: DataSource) {
    if (!(dataSource instanceof DataSource) || !dataSource.isInitialized)
      fail();
  }

  private issue(value: SnapshotData): ZcashBroadcastSnapshot {
    const binding = decodeZcashSigningBinding(
      encodeZcashSigningBinding(value.binding),
    );
    const snapshot = Object.freeze({
      txId: value.txId,
      eventId: value.eventId,
      attemptId: value.attemptId,
      signedTxJson: value.signedTxJson,
      binding,
      status: value.status,
      settlementJson: value.settlementJson,
    });
    this.issued.add(snapshot);
    this.fingerprints.set(snapshot, fingerprint(snapshot));
    return snapshot;
  }

  private requireIssued(value: ZcashBroadcastSnapshot): string {
    if (
      value === null ||
      typeof value !== 'object' ||
      !this.issued.has(value) ||
      this.fingerprints.get(value) !== fingerprint(value)
    ) {
      return fail();
    }
    return this.fingerprints.get(value)!;
  }

  private issueRecovery(
    value: ZcashObservedSigningRecoverySnapshot,
  ): ZcashObservedSigningRecoverySnapshot {
    const snapshot = Object.freeze({
      txId: value.txId,
      eventId: value.eventId,
      attemptId: value.attemptId,
      approvedTxJson: value.approvedTxJson,
      binding: decodeZcashSigningBinding(
        encodeZcashSigningBinding(value.binding),
      ),
    });
    this.recoveryIssued.add(snapshot);
    this.recoveryFingerprints.set(snapshot, recoveryFingerprint(snapshot));
    return snapshot;
  }

  private requireRecoveryIssued(
    value: ZcashObservedSigningRecoverySnapshot,
  ): string {
    if (
      value === null ||
      typeof value !== 'object' ||
      !this.recoveryIssued.has(value) ||
      this.recoveryFingerprints.get(value) !== recoveryFingerprint(value)
    )
      return fail();
    return this.recoveryFingerprints.get(value)!;
  }

  private async readMayDispatch(
    manager: EntityManager,
    requestedTxId: string,
  ): Promise<ZcashObservedSigningRecoverySnapshot> {
    const row = await manager.getRepository(TransactionEntity).findOne({
      relations: ['event', 'order'],
      where: { txId: requestedTxId },
    });
    if (
      !row ||
      row.txId !== requestedTxId ||
      row.chain !== 'zcash' ||
      row.type !== TransactionType.payment ||
      row.status !== TransactionStatus.inSign ||
      typeof row.approvalEvidence !== 'string' ||
      typeof row.signingAttemptId !== 'string' ||
      row.order !== null ||
      !row.event ||
      row.event.status !== EventStatus.inPayment ||
      row.event.zcashSigningAttemptId !== row.signingAttemptId
    )
      return fail();
    const attempt = await manager
      .getRepository(ZcashSigningAttemptEntity)
      .findOneBy({ attemptId: row.signingAttemptId });
    if (
      !attempt ||
      attempt.state !== 'may_dispatch' ||
      attempt.signedJson !== null ||
      attempt.txId !== row.txId ||
      attempt.activeTxId !== row.txId
    )
      return fail();
    const binding = decodeZcashSigningBinding(attempt.bindingJson);
    if (
      binding.txId !== row.txId ||
      binding.eventId !== row.event.id ||
      binding.approvalEvidence !== row.approvalEvidence ||
      binding.requiredSign !== row.requiredSign ||
      row.txJson !== binding.approvedTxJson ||
      attempt.eventKey !== `zcash:payment:${binding.eventId}` ||
      attempt.inputKey !== `${binding.genesisHash}:${binding.outpoint}` ||
      (await manager
        .getRepository(ZcashSettlementEntity)
        .countBy({ txId: row.txId })) !== 0
    )
      return fail();
    return {
      txId: row.txId,
      eventId: row.event.id,
      attemptId: attempt.attemptId,
      approvedTxJson: row.txJson,
      binding,
    };
  }

  private async read(
    manager: EntityManager,
    requestedTxId: string,
  ): Promise<SnapshotData> {
    const row = await manager.getRepository(TransactionEntity).findOne({
      relations: ['event', 'order'],
      where: { txId: requestedTxId },
    });
    if (
      !row ||
      row.txId !== requestedTxId ||
      row.chain !== 'zcash' ||
      row.type !== TransactionType.payment ||
      ![
        TransactionStatus.signed,
        TransactionStatus.sent,
        TransactionStatus.completed,
      ].includes(row.status) ||
      typeof row.approvalEvidence !== 'string' ||
      typeof row.signingAttemptId !== 'string' ||
      row.order !== null ||
      !row.event
    ) {
      return fail();
    }

    const attempt = await manager
      .getRepository(ZcashSigningAttemptEntity)
      .findOne({
        relations: ['transaction'],
        where: { attemptId: row.signingAttemptId },
      });
    if (
      !attempt ||
      attempt.state !== 'signed' ||
      attempt.txId !== row.txId ||
      attempt.activeTxId !== row.txId ||
      attempt.transaction?.txId !== row.txId ||
      typeof attempt.signedJson !== 'string'
    ) {
      return fail();
    }

    const binding = decodeZcashSigningBinding(attempt.bindingJson);
    if (
      binding.txId !== row.txId ||
      binding.eventId !== row.event.id ||
      binding.approvalEvidence !== row.approvalEvidence ||
      binding.requiredSign !== row.requiredSign ||
      attempt.eventKey !== `zcash:payment:${binding.eventId}` ||
      attempt.inputKey !== `${binding.genesisHash}:${binding.outpoint}` ||
      row.event.zcashSigningAttemptId !== attempt.attemptId ||
      row.txJson !== attempt.signedJson ||
      row.txJson === binding.approvedTxJson
    )
      fail();
    assertZcashPaymentIdentity(row.txJson, binding);

    const settlement = await manager
      .getRepository(ZcashSettlementEntity)
      .findOne({
        relations: ['transaction', 'attempt', 'event'],
        where: { txId: row.txId },
      });
    let settlementJson: string | null = null;
    if (row.status === TransactionStatus.completed) {
      if (!settlement) return fail();
      if (
        settlement.transaction?.txId !== row.txId ||
        settlement.attempt?.attemptId !== attempt.attemptId ||
        settlement.event?.id !== row.event.id
      )
        fail();
      const receipt = decodeZcashSettlementReceipt(settlement.receiptJson);
      if (
        receipt.txId !== row.txId ||
        receipt.eventId !== row.event.id ||
        receipt.attemptId !== attempt.attemptId ||
        receipt.genesisHash !== binding.genesisHash ||
        receipt.signedTxJsonSha256 !== sha256(row.txJson) ||
        receipt.bindingSha256 !== sha256(encodeZcashSigningBinding(binding)) ||
        receipt.confirmations < receipt.requiredConfirmations
      )
        fail();
      settlementJson = settlement.receiptJson;
    } else if (settlement) fail();

    return {
      txId: row.txId,
      eventId: row.event.id,
      attemptId: attempt.attemptId,
      signedTxJson: row.txJson,
      binding,
      status: row.status as 'signed' | 'sent' | 'completed',
      settlementJson,
    };
  }

  private compare(expectedFingerprint: string, current: SnapshotData): void {
    if (fingerprint(current) !== expectedFingerprint) fail();
  }

  private async lockEvent(
    manager: EntityManager,
    current: SnapshotData,
    requireCurrentEvent: boolean,
  ): Promise<void> {
    const event = await manager.getRepository(ConfirmedEventEntity).update(
      {
        id: current.eventId,
        zcashSigningAttemptId: current.attemptId,
        ...(requireCurrentEvent ? { status: EventStatus.inPayment } : {}),
      },
      { zcashSigningAttemptId: current.attemptId },
    );
    if (event.affected !== 1) fail();
  }

  private async casSent(
    manager: EntityManager,
    current: SnapshotData,
    requireCurrentEvent: boolean,
  ): Promise<void> {
    const result = await manager
      .getRepository(TransactionEntity)
      .createQueryBuilder()
      .update()
      .set({ status: TransactionStatus.sent })
      .where('"txId" = :txId', { txId: current.txId })
      .andWhere('"chain" = :chain', { chain: 'zcash' })
      .andWhere('"type" = :type', { type: TransactionType.payment })
      .andWhere('"status" = :status', { status: current.status })
      .andWhere('"txJson" = :signedTxJson', {
        signedTxJson: current.signedTxJson,
      })
      .andWhere('"approvalEvidence" = :approvalEvidence', {
        approvalEvidence: current.binding.approvalEvidence,
      })
      .andWhere('"requiredSign" = :requiredSign', {
        requiredSign: current.binding.requiredSign,
      })
      .andWhere('"signingAttemptId" = :attemptId', {
        attemptId: current.attemptId,
      })
      .andWhere('"eventId" = :eventId', { eventId: current.eventId })
      .andWhere('"orderId" IS NULL')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "zcash_settlement_entity" s
          WHERE s."txId" = :txId
        )`,
      )
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "zcash_signing_attempt_entity" a
          WHERE a."attemptId" = :attemptId
          AND a."txId" = :txId
          AND a."activeTxId" = :txId
          AND a."eventKey" = :eventKey
          AND a."inputKey" = :inputKey
          AND a."bindingJson" = :bindingJson
          AND a."state" = 'signed'
          AND a."signedJson" = :signedTxJson
        )`,
        {
          eventKey: `zcash:payment:${current.eventId}`,
          inputKey: `${current.binding.genesisHash}:${current.binding.outpoint}`,
          bindingJson: encodeZcashSigningBinding(current.binding),
        },
      )
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "confirmed_event_entity" e
          WHERE e."id" = :eventId
          AND e."zcashSigningAttemptId" = :attemptId
          ${requireCurrentEvent ? `AND e."status" = :eventStatus` : ''}
        )`,
        requireCurrentEvent ? { eventStatus: EventStatus.inPayment } : {},
      )
      .execute();
    if (result.affected !== 1) fail();
  }

  private settlementJson(
    snapshot: ZcashBroadcastSnapshot,
    proof: ZcashConfirmedPayment,
    authority: ZcashEventRewardSnapshot,
  ): string {
    if (snapshot.status !== 'sent' || snapshot.settlementJson !== null) fail();
    return this.confirmedSettlementJson(snapshot, proof, authority);
  }

  private confirmedSettlementJson(
    snapshot: Pick<
      ZcashBroadcastSnapshot,
      'txId' | 'eventId' | 'attemptId' | 'signedTxJson' | 'binding'
    >,
    proof: ZcashConfirmedPayment,
    authority: ZcashEventRewardSnapshot,
  ): string {
    assertZcashConfirmedPayment(proof);
    assertZcashEventRewardSnapshot(authority);
    if (
      authority.eventId !== snapshot.eventId ||
      !isEqual(proof.payments, authority.payments)
    )
      fail();
    const receipt = decodeZcashSettlementReceipt(proof.receiptJson);
    if (
      !isEqual(receipt, proof.receipt) ||
      receipt.txId !== snapshot.txId ||
      receipt.eventId !== snapshot.eventId ||
      receipt.attemptId !== snapshot.attemptId ||
      receipt.genesisHash !== snapshot.binding.genesisHash ||
      receipt.signedTxJsonSha256 !== sha256(snapshot.signedTxJson) ||
      receipt.bindingSha256 !==
        sha256(encodeZcashSigningBinding(snapshot.binding)) ||
      receipt.eventContextJson !== authority.eventContextJson ||
      receipt.confirmations < receipt.requiredConfirmations
    )
      fail();
    return proof.receiptJson;
  }

  private async casCompleted(
    manager: EntityManager,
    current: SnapshotData,
    receiptJson: string,
    lastStatusUpdate: string,
  ): Promise<void> {
    if (current.status !== 'sent' || current.settlementJson !== null) fail();
    const result = await manager
      .getRepository(TransactionEntity)
      .createQueryBuilder()
      .update()
      .set({
        status: TransactionStatus.completed,
        lastStatusUpdate,
      })
      .where('"txId" = :txId', { txId: current.txId })
      .andWhere('"chain" = :chain', { chain: 'zcash' })
      .andWhere('"type" = :type', { type: TransactionType.payment })
      .andWhere('"status" = :status', { status: TransactionStatus.sent })
      .andWhere('"txJson" = :signedTxJson', {
        signedTxJson: current.signedTxJson,
      })
      .andWhere('"approvalEvidence" = :approvalEvidence', {
        approvalEvidence: current.binding.approvalEvidence,
      })
      .andWhere('"requiredSign" = :requiredSign', {
        requiredSign: current.binding.requiredSign,
      })
      .andWhere('"signingAttemptId" = :attemptId', {
        attemptId: current.attemptId,
      })
      .andWhere('"eventId" = :eventId', { eventId: current.eventId })
      .andWhere('"orderId" IS NULL')
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "zcash_signing_attempt_entity" a
          WHERE a."attemptId" = :attemptId
          AND a."txId" = :txId
          AND a."activeTxId" = :txId
          AND a."eventKey" = :eventKey
          AND a."inputKey" = :inputKey
          AND a."bindingJson" = :bindingJson
          AND a."state" = 'signed'
          AND a."signedJson" = :signedTxJson
        )`,
        {
          eventKey: `zcash:payment:${current.eventId}`,
          inputKey: `${current.binding.genesisHash}:${current.binding.outpoint}`,
          bindingJson: encodeZcashSigningBinding(current.binding),
        },
      )
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "zcash_settlement_entity" s
          WHERE s."txId" = :txId
          AND s."attemptId" = :attemptId
          AND s."eventId" = :eventId
          AND s."receiptJson" = :receiptJson
        )`,
        { receiptJson },
      )
      .execute();
    if (result.affected !== 1) fail();
  }

  private async casPendingReward(
    manager: EntityManager,
    current: SnapshotData,
    receiptJson: string,
    firstTry: string,
  ): Promise<void> {
    const result = await manager
      .getRepository(ConfirmedEventEntity)
      .createQueryBuilder()
      .update()
      .set({ status: EventStatus.pendingReward, firstTry })
      .where('"id" = :eventId', { eventId: current.eventId })
      .andWhere('"status" = :eventStatus', {
        eventStatus: EventStatus.inPayment,
      })
      .andWhere('"zcashSigningAttemptId" = :attemptId', {
        attemptId: current.attemptId,
      })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM "zcash_settlement_entity" s
          JOIN "transaction_entity" t ON t."txId" = s."txId"
          JOIN "zcash_signing_attempt_entity" a
            ON a."attemptId" = s."attemptId"
          WHERE s."txId" = :txId
          AND s."attemptId" = :attemptId
          AND s."eventId" = :eventId
          AND s."receiptJson" = :receiptJson
          AND t."status" = 'completed'
          AND t."signingAttemptId" = a."attemptId"
          AND t."txJson" = a."signedJson"
          AND a."state" = 'signed'
        )`,
        { txId: current.txId, receiptJson },
      )
      .execute();
    if (result.affected !== 1) fail();
  }

  async load(requestedTxId: string): Promise<ZcashBroadcastSnapshot> {
    return this.issue(
      await this.read(this.dataSource.manager, txId(requestedTxId)),
    );
  }

  async loadObservedSigningRecovery(
    requestedTxId: string,
  ): Promise<ZcashObservedSigningRecoverySnapshot> {
    return this.issueRecovery(
      await this.readMayDispatch(this.dataSource.manager, txId(requestedTxId)),
    );
  }

  async assertCurrent(snapshot: ZcashBroadcastSnapshot): Promise<void> {
    const expected = this.requireIssued(snapshot);
    this.compare(
      expected,
      await this.read(this.dataSource.manager, snapshot.txId),
    );
  }

  /** Stores a caller-established native observation marker; it does not prove chain truth. */
  async markObserved(
    snapshot: ZcashBroadcastSnapshot,
  ): Promise<ZcashBroadcastSnapshot> {
    const expected = this.requireIssued(snapshot);
    if (snapshot.status === 'completed' || snapshot.settlementJson !== null)
      fail();
    const expectedSent = fingerprint({ ...snapshot, status: 'sent' });
    const result = await withZcashSigningTransaction(
      this.dataSource,
      async (manager) => {
        let current = await this.read(manager, snapshot.txId);
        this.compare(expected, current);
        await this.lockEvent(manager, current, false);
        current = await this.read(manager, snapshot.txId);
        this.compare(expected, current);
        await this.casSent(manager, current, false);
        const sent = await this.read(manager, snapshot.txId);
        this.compare(expectedSent, sent);
        return sent;
      },
    );
    return this.issue(result);
  }

  async reserveSubmission(
    snapshot: ZcashBroadcastSnapshot,
    authority: ZcashEventPaymentSnapshot,
  ): Promise<ZcashBroadcastSnapshot> {
    const expected = this.requireIssued(snapshot);
    if (snapshot.status === 'completed' || snapshot.settlementJson !== null)
      fail();
    const expectedSent = fingerprint({ ...snapshot, status: 'sent' });
    assertZcashEventPaymentSnapshot(authority);
    if (authority.eventId !== snapshot.eventId) fail();
    authority.assertPolicyCurrent();
    const result = await withZcashSigningTransaction(
      this.dataSource,
      async (manager) => {
        let current = await this.read(manager, snapshot.txId);
        this.compare(expected, current);
        await this.lockEvent(manager, current, true);
        authority.assertPolicyCurrent();
        await authority.assertStoredEvent(manager, snapshot.eventId);
        authority.assertPolicyCurrent();
        current = await this.read(manager, snapshot.txId);
        this.compare(expected, current);
        const checkedEvent = await manager
          .getRepository(ConfirmedEventEntity)
          .findOneBy({ id: snapshot.eventId });
        if (
          checkedEvent?.status !== EventStatus.inPayment ||
          checkedEvent.zcashSigningAttemptId !== snapshot.attemptId
        )
          fail();
        await this.casSent(manager, current, true);
        authority.assertPolicyCurrent();
        const sent = await this.read(manager, snapshot.txId);
        this.compare(expectedSent, sent);
        return sent;
      },
    );
    return this.issue(result);
  }

  async settleObservedSpentRecovery(
    recovery: ZcashObservedSigningRecoverySnapshot,
    signedTxJson: string,
    proof: ZcashConfirmedPayment,
    authority: ZcashSpentEventRecoverySnapshot,
  ): Promise<ZcashBroadcastSnapshot> {
    const expected = this.requireRecoveryIssued(recovery);
    assertZcashPaymentIdentity(signedTxJson, recovery.binding);
    if (signedTxJson === recovery.approvedTxJson) fail();
    assertZcashConfirmedPayment(proof);
    assertZcashSpentEventRecoverySnapshot(authority);
    const receipt = decodeZcashSettlementReceipt(proof.receiptJson);
    if (
      authority.eventId !== recovery.eventId ||
      authority.paymentTxId !== recovery.txId ||
      !isEqual(proof.payments, authority.payments) ||
      !isEqual(receipt, proof.receipt) ||
      receipt.txId !== recovery.txId ||
      receipt.eventId !== recovery.eventId ||
      receipt.attemptId !== recovery.attemptId ||
      receipt.genesisHash !== recovery.binding.genesisHash ||
      receipt.signedTxJsonSha256 !== sha256(signedTxJson) ||
      receipt.bindingSha256 !==
        sha256(encodeZcashSigningBinding(recovery.binding)) ||
      receipt.eventContextJson !== authority.eventContextJson ||
      receipt.confirmations < receipt.requiredConfirmations
    )
      fail();
    const receiptJson = proof.receiptJson;
    const expectedCompleted = fingerprint({
      txId: recovery.txId,
      eventId: recovery.eventId,
      attemptId: recovery.attemptId,
      signedTxJson,
      binding: recovery.binding,
      status: 'completed',
      settlementJson: receiptJson,
    });
    const firstTry = String(Math.round(Date.now() / 1000));
    await authority.assertCurrent();
    const completed = await withZcashSigningTransaction(
      this.dataSource,
      async (manager) => {
        let current = await this.readMayDispatch(manager, recovery.txId);
        if (recoveryFingerprint(current) !== expected) fail();
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        const eventLock = await manager
          .getRepository(ConfirmedEventEntity)
          .update(
            {
              id: recovery.eventId,
              status: EventStatus.inPayment,
              zcashSigningAttemptId: recovery.attemptId,
            },
            { zcashSigningAttemptId: recovery.attemptId },
          );
        if (eventLock.affected !== 1) fail();
        await authority.assertStoredEvent(manager, recovery.eventId);
        await proof.assertCurrent();
        await authority.assertChainCurrent();
        await authority.assertStoredEvent(manager, recovery.eventId);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        current = await this.readMayDispatch(manager, recovery.txId);
        if (recoveryFingerprint(current) !== expected) fail();

        await manager.getRepository(ZcashSettlementEntity).insert({
          txId: recovery.txId,
          attemptId: recovery.attemptId,
          eventId: recovery.eventId,
          receiptJson,
        });
        const attempt = await manager
          .getRepository(ZcashSigningAttemptEntity)
          .update(
            {
              attemptId: recovery.attemptId,
              txId: recovery.txId,
              activeTxId: recovery.txId,
              eventKey: `zcash:payment:${recovery.eventId}`,
              inputKey: `${recovery.binding.genesisHash}:${recovery.binding.outpoint}`,
              bindingJson: encodeZcashSigningBinding(recovery.binding),
              state: 'may_dispatch',
              signedJson: IsNull(),
            },
            { state: 'signed', signedJson: signedTxJson },
          );
        if (attempt.affected !== 1) fail();
        const transaction = await manager
          .getRepository(TransactionEntity)
          .createQueryBuilder()
          .update()
          .set({
            txJson: signedTxJson,
            status: TransactionStatus.completed,
            lastStatusUpdate: firstTry,
          })
          .where('"txId" = :txId', { txId: recovery.txId })
          .andWhere('"chain" = :chain', { chain: 'zcash' })
          .andWhere('"type" = :type', { type: TransactionType.payment })
          .andWhere('"status" = :status', {
            status: TransactionStatus.inSign,
          })
          .andWhere('"txJson" = :approvedTxJson', {
            approvedTxJson: recovery.approvedTxJson,
          })
          .andWhere('"approvalEvidence" = :approvalEvidence', {
            approvalEvidence: recovery.binding.approvalEvidence,
          })
          .andWhere('"requiredSign" = :requiredSign', {
            requiredSign: recovery.binding.requiredSign,
          })
          .andWhere('"signingAttemptId" = :attemptId', {
            attemptId: recovery.attemptId,
          })
          .andWhere('"eventId" = :eventId', { eventId: recovery.eventId })
          .andWhere('"orderId" IS NULL')
          .execute();
        if (transaction.affected !== 1) fail();
        await authority.assertStoredEvent(manager, recovery.eventId);
        await manager.getRepository(TransactionEntity).insert({
          txId: authority.rewardTxId,
          txJson: authority.rewardTxJson,
          approvalEvidence: null,
          signingAttemptId: null,
          type: TransactionType.reward,
          chain: 'ergo',
          status: TransactionStatus.completed,
          lastCheck: 0,
          lastStatusUpdate: firstTry,
          failedInSign: false,
          signFailedCount: 0,
          requiredSign: recovery.binding.requiredSign,
          event: { id: recovery.eventId },
          order: null,
        });
        const eventCompletion = await manager
          .getRepository(ConfirmedEventEntity)
          .update(
            {
              id: recovery.eventId,
              status: EventStatus.inPayment,
              zcashSigningAttemptId: recovery.attemptId,
            },
            { status: EventStatus.completed, firstTry },
          );
        if (eventCompletion.affected !== 1) fail();
        const result = await this.read(manager, recovery.txId);
        this.compare(expectedCompleted, result);
        const event = await manager
          .getRepository(ConfirmedEventEntity)
          .findOneBy({ id: recovery.eventId });
        if (
          event?.status !== EventStatus.completed ||
          event.zcashSigningAttemptId !== recovery.attemptId ||
          event.firstTry !== firstTry
        )
          fail();
        const reward = await manager.getRepository(TransactionEntity).findOne({
          where: { txId: authority.rewardTxId },
          relations: ['event', 'order'],
        });
        if (
          reward?.txJson !== authority.rewardTxJson ||
          reward.type !== TransactionType.reward ||
          reward.chain !== 'ergo' ||
          reward.status !== TransactionStatus.completed ||
          reward.event?.id !== recovery.eventId ||
          reward.order !== null
        )
          fail();
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        return result;
      },
    );
    return this.issue(completed);
  }

  async settleConfirmed(
    snapshot: ZcashBroadcastSnapshot,
    proof: ZcashConfirmedPayment,
    authority: ZcashEventRewardSnapshot,
  ): Promise<ZcashBroadcastSnapshot> {
    const expected = this.requireIssued(snapshot);
    const receiptJson = this.settlementJson(snapshot, proof, authority);
    const expectedCompleted = fingerprint({
      ...snapshot,
      status: 'completed',
      settlementJson: receiptJson,
    });
    const firstTry = String(Math.round(Date.now() / 1000));
    const result = await withZcashSigningTransaction(
      this.dataSource,
      async (manager) => {
        let current = await this.read(manager, snapshot.txId);
        if (current.status === 'completed') {
          this.compare(expectedCompleted, current);
          const event = await manager
            .getRepository(ConfirmedEventEntity)
            .findOneBy({ id: snapshot.eventId });
          if (
            event?.zcashSigningAttemptId !== snapshot.attemptId ||
            ![
              EventStatus.pendingReward,
              EventStatus.inReward,
              EventStatus.rewardWaiting,
              EventStatus.completed,
            ].includes(event.status)
          )
            fail();
          return current;
        }
        this.compare(expected, current);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        await this.lockEvent(manager, current, true);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        await authority.assertStoredEvent(manager, snapshot.eventId);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        await proof.assertCurrent();
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        await authority.assertStoredEvent(manager, snapshot.eventId);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        current = await this.read(manager, snapshot.txId);
        this.compare(expected, current);
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        await manager.getRepository(ZcashSettlementEntity).insert({
          txId: snapshot.txId,
          attemptId: snapshot.attemptId,
          eventId: snapshot.eventId,
          receiptJson,
        });
        await this.casCompleted(manager, current, receiptJson, firstTry);
        await authority.assertStoredEvent(manager, snapshot.eventId);
        await this.casPendingReward(manager, current, receiptJson, firstTry);
        const completed = await this.read(manager, snapshot.txId);
        this.compare(expectedCompleted, completed);
        const event = await manager
          .getRepository(ConfirmedEventEntity)
          .findOneBy({ id: snapshot.eventId });
        if (
          event?.status !== EventStatus.pendingReward ||
          event.zcashSigningAttemptId !== snapshot.attemptId ||
          event.firstTry !== firstTry
        )
          fail();
        proof.assertPolicyCurrent();
        authority.assertPolicyCurrent();
        return completed;
      },
    );
    return this.issue(result);
  }
}
