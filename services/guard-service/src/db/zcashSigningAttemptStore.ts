import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  Not,
} from '@rosen-bridge/extended-typeorm';

import {
  assertZcashEventPaymentSnapshot,
  type ZcashEventPaymentSnapshot,
} from '../transaction/zcashEventPaymentAuthority';
import {
  assertZcashPaymentIdentity,
  decodeZcashSigningBinding,
  encodeZcashSigningBinding,
  ZcashSigningBinding,
} from '../transaction/zcashSigningContext';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { TransactionEntity } from './entities/transactionEntity';
import { ZcashSigningAttemptEntity } from './entities/zcashSigningAttemptEntity';

const fail = (): never => {
  throw Error('Zcash signing attempt conflict');
};
const captured = (attemptId: string, value: ZcashSigningBinding) => {
  if (
    typeof attemptId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(attemptId)
  )
    fail();
  const bindingJson = encodeZcashSigningBinding(value);
  return { bindingJson, binding: decodeZcashSigningBinding(bindingJson) };
};

// SQLite shares a query runner per DataSource; this prevents nested local transactions.
// Cross-connection custody comes from SQL predicates and unique reservation indexes.
const queues = new WeakMap<DataSource, Promise<unknown>>();
export function withZcashSigningTransaction<T>(
  dataSource: DataSource,
  action: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const previous = queues.get(dataSource) ?? Promise.resolve();
  const next = previous.then(() => dataSource.transaction(action));
  queues.set(
    dataSource,
    next.catch(() => undefined),
  );
  return next;
}

export class ZcashSigningAttemptStore {
  constructor(private readonly dataSource: DataSource) {}

  private transaction<T>(
    action: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return withZcashSigningTransaction(this.dataSource, action);
  }

  private row(binding: ZcashSigningBinding) {
    return {
      txId: binding.txId,
      chain: 'zcash',
      type: 'payment',
      txJson: binding.approvedTxJson,
      approvalEvidence: binding.approvalEvidence,
      requiredSign: binding.requiredSign,
      event: { id: binding.eventId },
      order: IsNull(),
    };
  }

  private async lockEvent(
    manager: EntityManager,
    binding: ZcashSigningBinding,
    attemptId: string,
    claim = false,
    authority?: ZcashEventPaymentSnapshot,
  ) {
    const result = await manager.getRepository(ConfirmedEventEntity).update(
      {
        id: binding.eventId,
        status: EventStatus.inPayment,
        zcashSigningAttemptId: claim ? IsNull() : attemptId,
      },
      { zcashSigningAttemptId: attemptId },
    );
    if (result.affected !== 1) fail();
    if (authority) await authority.assertStoredEvent(manager, binding.eventId);
  }

  async claim(
    attemptId: string,
    value: ZcashSigningBinding,
    authority?: ZcashEventPaymentSnapshot,
  ): Promise<void> {
    if (authority !== undefined) assertZcashEventPaymentSnapshot(authority);
    const { binding, bindingJson } = captured(attemptId, value);
    await this.transaction(async (manager) => {
      await this.lockEvent(manager, binding, attemptId, true, authority);
      const result = await manager.getRepository(TransactionEntity).update(
        {
          ...this.row(binding),
          status: TransactionStatus.approved,
          signingAttemptId: IsNull(),
        },
        { status: TransactionStatus.inSign, signingAttemptId: attemptId },
      );
      if (result.affected !== 1) fail();
      await manager.getRepository(ZcashSigningAttemptEntity).insert({
        attemptId,
        txId: binding.txId,
        activeTxId: binding.txId,
        eventKey: `zcash:payment:${binding.eventId}`,
        inputKey: `${binding.genesisHash}:${binding.outpoint}`,
        bindingJson,
        state: 'prepared',
        signedJson: null,
      });
    });
  }

  async markMayDispatch(
    attemptId: string,
    value: ZcashSigningBinding,
    authority?: ZcashEventPaymentSnapshot,
  ): Promise<void> {
    if (authority !== undefined) assertZcashEventPaymentSnapshot(authority);
    const { binding, bindingJson } = captured(attemptId, value);
    await this.transaction(async (manager) => {
      await this.lockEvent(manager, binding, attemptId, false, authority);
      const row = await manager.getRepository(TransactionEntity).update(
        {
          ...this.row(binding),
          status: TransactionStatus.inSign,
          signingAttemptId: attemptId,
        },
        { status: TransactionStatus.inSign },
      );
      if (row.affected !== 1) fail();
      const result = await manager
        .getRepository(ZcashSigningAttemptEntity)
        .update(
          {
            attemptId,
            txId: binding.txId,
            activeTxId: binding.txId,
            bindingJson,
            state: 'prepared',
          },
          { state: 'may_dispatch' },
        );
      if (result.affected !== 1) fail();
    });
  }

  /** Rechecks current custody without granting a new dispatch or changing its state. */
  async assertMayDispatchCurrent(
    attemptId: string,
    value: ZcashSigningBinding,
    authority?: ZcashEventPaymentSnapshot,
  ): Promise<void> {
    if (authority !== undefined) assertZcashEventPaymentSnapshot(authority);
    const { binding, bindingJson } = captured(attemptId, value);
    await this.transaction(async (manager) => {
      await this.lockEvent(manager, binding, attemptId, false, authority);
      const row = await manager.getRepository(TransactionEntity).update(
        {
          ...this.row(binding),
          status: TransactionStatus.inSign,
          signingAttemptId: attemptId,
        },
        { status: TransactionStatus.inSign },
      );
      if (row.affected !== 1) fail();
      const attempt = await manager
        .getRepository(ZcashSigningAttemptEntity)
        .update(
          {
            attemptId,
            txId: binding.txId,
            activeTxId: binding.txId,
            eventKey: `zcash:payment:${binding.eventId}`,
            inputKey: `${binding.genesisHash}:${binding.outpoint}`,
            bindingJson,
            state: 'may_dispatch',
            signedJson: IsNull(),
          },
          { state: 'may_dispatch' },
        );
      if (attempt.affected !== 1) fail();
    });
  }

  async complete(
    attemptId: string,
    value: ZcashSigningBinding,
    signedTxJson: string,
  ): Promise<void> {
    const { binding, bindingJson } = captured(attemptId, value);
    assertZcashPaymentIdentity(signedTxJson, binding);
    if (signedTxJson === binding.approvedTxJson) fail();
    await this.transaction(async (manager) => {
      const event = await manager
        .getRepository(ConfirmedEventEntity)
        .update(
          { id: binding.eventId, zcashSigningAttemptId: attemptId },
          { zcashSigningAttemptId: attemptId },
        );
      if (event.affected !== 1) fail();
      const repository = manager.getRepository(ZcashSigningAttemptEntity);
      const attempt = await repository.findOneBy({
        attemptId,
        txId: binding.txId,
        activeTxId: binding.txId,
        bindingJson,
      });
      if (!attempt) return fail();
      if (attempt.state === 'signed') {
        if (attempt.signedJson !== signedTxJson) fail();
        const row = await manager.getRepository(TransactionEntity).findOneBy({
          ...this.row(binding),
          txJson: signedTxJson,
          signingAttemptId: attemptId,
          status: In([
            TransactionStatus.signed,
            TransactionStatus.sent,
            TransactionStatus.completed,
          ]),
        });
        if (!row) fail();
        return;
      }
      if (attempt.state !== 'may_dispatch') fail();
      const row = await manager.getRepository(TransactionEntity).update(
        {
          ...this.row(binding),
          status: TransactionStatus.inSign,
          signingAttemptId: attemptId,
        },
        { txJson: signedTxJson, status: TransactionStatus.signed },
      );
      if (row.affected !== 1) fail();
      const result = await repository.update(
        {
          attemptId,
          txId: binding.txId,
          bindingJson,
          state: 'may_dispatch',
          activeTxId: binding.txId,
          signedJson: IsNull(),
        },
        { state: 'signed', signedJson: signedTxJson },
      );
      if (result.affected !== 1) fail();
    });
  }

  async abandonPrepared(
    attemptId: string,
    value: ZcashSigningBinding,
  ): Promise<void> {
    const { binding, bindingJson } = captured(attemptId, value);
    await this.transaction(async (manager) => {
      const event = await manager
        .getRepository(ConfirmedEventEntity)
        .update(
          { id: binding.eventId, zcashSigningAttemptId: attemptId },
          { zcashSigningAttemptId: null },
        );
      if (event.affected !== 1) fail();
      const row = await manager.getRepository(TransactionEntity).update(
        {
          ...this.row(binding),
          status: TransactionStatus.inSign,
          signingAttemptId: attemptId,
        },
        { status: TransactionStatus.approved, signingAttemptId: null },
      );
      if (row.affected !== 1) fail();
      const result = await manager
        .getRepository(ZcashSigningAttemptEntity)
        .update(
          {
            attemptId,
            txId: binding.txId,
            eventKey: `zcash:payment:${binding.eventId}`,
            inputKey: `${binding.genesisHash}:${binding.outpoint}`,
            bindingJson,
            state: 'prepared',
            activeTxId: binding.txId,
            signedJson: IsNull(),
          },
          { state: 'abandoned', activeTxId: null },
        );
      if (result.affected !== 1) fail();
    });
  }

  async getActive(txId: string): Promise<ZcashSigningAttemptEntity | null> {
    if (typeof txId !== 'string' || !/^[0-9a-f]{64}$/.test(txId)) fail();
    return this.dataSource.getRepository(ZcashSigningAttemptEntity).findOneBy({
      txId,
      state: Not('abandoned'),
    });
  }
}
