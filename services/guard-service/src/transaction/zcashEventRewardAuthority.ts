import {
  DataSource,
  EntityManager,
  IsNull,
} from '@rosen-bridge/extended-typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import type { EventTrigger, PaymentOrder } from '@rosen-chains/abstract-chain';

import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';
import EventSerializer from '../event/eventSerializer';
import { EventStatus } from '../utils/constants';
import { captureZcashEventPolicy } from './zcashEventPaymentAuthority';

const issued = new WeakSet<object>();
const spendFields = [
  'spendHeight',
  'spendBlock',
  'spendTxId',
  'result',
  'paymentTxId',
] as const;
const rawFields = [
  'id',
  'extractor',
  'identifier',
  'serialized',
  'block',
  'height',
  'eventId',
  'txId',
  'fromChain',
  'toChain',
  'fromAddress',
  'toAddress',
  'amount',
  'bridgeFee',
  'networkFee',
  'sourceChainTokenId',
  'sourceChainHeight',
  'targetChainTokenId',
  'sourceTxId',
  'sourceBlockId',
  'WIDsCount',
  'WIDsHash',
] as const;

export interface ZcashEventRewardSnapshot {
  readonly eventId: string;
  readonly eventTxId: string;
  readonly event: Readonly<EventTrigger>;
  readonly eventContextJson: string;
  readonly payments: PaymentOrder;
  assertPolicyCurrent(): void;
  assertStoredEvent(manager: EntityManager, eventId: string): Promise<void>;
  assertCurrent(): Promise<void>;
}

const fail = (reason: string): never => {
  throw Error(`Invalid Zcash reward authority: ${reason}`);
};
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export function assertZcashEventRewardSnapshot(
  value: unknown,
): asserts value is ZcashEventRewardSnapshot {
  if (value === null || typeof value !== 'object' || !issued.has(value))
    fail('unknown snapshot');
}

/** Current local trigger eligibility; this does not reconstruct an event baseline at signing time. */
export class ZcashEventRewardAuthority {
  constructor(private readonly source: DataSource) {
    if (!(source instanceof DataSource) || !source.isInitialized)
      fail('data source');
  }

  private async read(
    manager: EntityManager,
    eventId: string,
    phase: 'settlement' | 'reward',
  ) {
    const confirmed = await manager
      .getRepository(ConfirmedEventEntity)
      .findOne({
        where: { id: eventId },
        relations: ['eventData'],
      });
    if (!confirmed?.eventData) return fail('missing event');
    const statuses: string[] =
      phase === 'settlement'
        ? [EventStatus.inPayment]
        : [
            EventStatus.pendingReward,
            EventStatus.inReward,
            EventStatus.rewardWaiting,
          ];
    const event = EventSerializer.fromConfirmedEntity(confirmed);
    const data = confirmed.eventData;
    if (
      !statuses.includes(confirmed.status) ||
      confirmed.id !== eventId ||
      data.eventId !== eventId ||
      EventSerializer.getId(event) !== eventId ||
      event.toChain !== 'zcash' ||
      event.targetChainTokenId !== 'zec'
    )
      fail('event binding');
    if (spendFields.some((field) => data[field] != null))
      fail('trigger is spent or contradictory');
    for (const key of rawFields) {
      const value = data[key];
      if (['id', 'height', 'sourceChainHeight', 'WIDsCount'].includes(key)) {
        if (
          typeof value !== 'number' ||
          !Number.isSafeInteger(value) ||
          value < 0 ||
          Object.is(value, -0)
        )
          fail('raw trigger shape');
      } else if (
        typeof value !== 'string' ||
        (value.length === 0 && key !== 'sourceBlockId') ||
        value.length > 2_000_000
      )
        fail(`raw trigger shape: ${key}`);
    }
    const bytes = Buffer.from(data.serialized, 'base64');
    if (bytes.length === 0 || bytes.toString('base64') !== data.serialized)
      fail('serialized trigger');
    // EventBoxes selects by trigger txId; bind its actual lookup cardinality.
    const matches = await manager
      .getRepository(EventTriggerEntity)
      .find({ where: { txId: data.txId } });
    if (matches.length !== 1 || matches[0].id !== data.id)
      fail('ambiguous trigger transaction');
    const raw: Record<string, string | number | null> = Object.fromEntries(
      rawFields.map((field) => [field, data[field]]),
    );
    for (const field of spendFields) raw[field] = null;
    return { event, raw, eventTxId: data.txId };
  }

  async capture(
    eventId: string,
    phase: 'settlement' | 'reward' = 'settlement',
  ): Promise<ZcashEventRewardSnapshot> {
    if (
      !/^[0-9a-f]{64}$/.test(eventId) ||
      !['settlement', 'reward'].includes(phase)
    )
      fail('request');
    const initial = await this.read(this.source.manager, eventId, phase);
    const event = Object.freeze({ ...initial.event });
    const policy = captureZcashEventPolicy(event);
    const eventContextJson = JSON.stringify({
      schema: 1,
      raw: initial.raw,
      policy,
    });
    const [address, amount] = JSON.parse(policy.payment) as [string, string];
    const payments = Object.freeze([
      Object.freeze({
        address,
        assets: Object.freeze({
          nativeToken: BigInt(amount),
          tokens: Object.freeze([]),
        }),
      }),
    ]) as unknown as PaymentOrder;
    const assertPolicyCurrent = () => {
      if (!same(captureZcashEventPolicy(event), policy)) fail('policy changed');
    };
    const assertStored = async (manager: EntityManager) => {
      const current = await this.read(manager, eventId, phase);
      if (!same(current.raw, initial.raw)) fail('stored trigger changed');
    };
    const assertStoredEvent = async (
      manager: EntityManager,
      expectedEventId: string,
    ) => {
      if (manager.connection !== this.source || expectedEventId !== eventId)
        fail('data source or event mismatch');
      await assertStored(manager);
      const where = Object.fromEntries(
        Object.entries(initial.raw).map(([key, value]) => [
          key,
          value === null ? IsNull() : value,
        ]),
      );
      const result = await manager
        .getRepository(EventTriggerEntity)
        .update(where, { id: initial.raw.id as number });
      if (result.affected !== 1) fail('stored trigger changed');
      await assertStored(manager);
    };
    const assertCurrent = async () => {
      assertPolicyCurrent();
      await assertStored(this.source.manager);
      assertPolicyCurrent();
    };
    const snapshot = Object.freeze({
      eventId,
      eventTxId: initial.eventTxId,
      event,
      eventContextJson,
      payments,
      assertPolicyCurrent,
      assertStoredEvent,
      assertCurrent,
    });
    issued.add(snapshot);
    return snapshot;
  }
}
