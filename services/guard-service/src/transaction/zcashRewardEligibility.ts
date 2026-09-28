import { isEqual } from 'lodash-es';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import type { EventTrigger } from '@rosen-chains/abstract-chain';

import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';
import { TransactionEntity } from '../db/entities/transactionEntity';
import { ZcashSigningAttemptEntity } from '../db/entities/zcashSigningAttemptEntity';
import { ZcashBroadcastStore } from '../db/zcashBroadcastStore';
import EventSerializer from '../event/eventSerializer';
import {
  decodeZcashSettlementReceipt,
  ZcashConfirmationAuthority,
  type ZcashConfirmationSource,
} from './zcashConfirmationAuthority';
import { ZcashEventRewardAuthority } from './zcashEventRewardAuthority';

export interface ZcashRewardAuthorization {
  readonly paymentTxId: string;
  assertCurrent(): Promise<void>;
  assertPolicyCurrent(): void;
}

/** Shared by reward generation and verification, including same-transaction retries. */
export class ZcashRewardEligibility {
  /** Select from retained custody too: mutable event metadata cannot choose a weaker verifier. */
  static async isRequired(
    source: DataSource,
    eventId: string,
    targetChain: string,
  ): Promise<boolean> {
    if (targetChain === 'zcash') return true;
    const confirmed = await source
      .getRepository(ConfirmedEventEntity)
      .findOneBy({ id: eventId });
    if (confirmed?.zcashSigningAttemptId) return true;
    return source
      .getRepository(TransactionEntity)
      .existsBy({ event: { id: eventId }, chain: 'zcash' });
  }

  private readonly store: ZcashBroadcastStore;
  private readonly eventAuthority: ZcashEventRewardAuthority;
  private readonly confirmation: ZcashConfirmationAuthority;

  constructor(
    private readonly source: DataSource,
    capability: ZcashConfirmationSource,
  ) {
    this.store = new ZcashBroadcastStore(source);
    this.eventAuthority = new ZcashEventRewardAuthority(source);
    this.confirmation = new ZcashConfirmationAuthority(capability);
  }

  async capture(
    event: EventTrigger,
    eventTxId: string,
  ): Promise<ZcashRewardAuthorization> {
    const eventId = EventSerializer.getId(event);
    const confirmed = await this.source
      .getRepository(ConfirmedEventEntity)
      .findOneBy({ id: eventId });
    const attemptId = confirmed?.zcashSigningAttemptId;
    if (!attemptId)
      throw Error('Zcash reward requires settled payment custody');
    const attempt = await this.source
      .getRepository(ZcashSigningAttemptEntity)
      .findOneBy({ attemptId });
    if (!attempt) throw Error('Zcash reward requires settled payment custody');
    const snapshot = await this.store.load(attempt.txId);
    if (
      snapshot.status !== 'completed' ||
      snapshot.eventId !== eventId ||
      !snapshot.settlementJson
    )
      throw Error('Zcash reward requires completed settlement');
    const receipt = decodeZcashSettlementReceipt(snapshot.settlementJson);
    const authority = await this.eventAuthority.capture(eventId, 'reward');
    if (
      !isEqual(event, authority.event) ||
      eventTxId !== authority.eventTxId ||
      authority.eventContextJson !== receipt.eventContextJson
    )
      throw Error('Zcash reward event differs from settled context');
    const proof = await this.confirmation.capture(
      snapshot,
      authority.eventContextJson,
    );
    if (
      !proof ||
      !isEqual(proof.payments, authority.payments) ||
      proof.receipt.blockHash !== receipt.blockHash ||
      proof.receipt.blockHeight !== receipt.blockHeight
    )
      throw Error('Zcash reward confirmation differs from settlement');
    for (const field of [
      'network',
      'genesisHash',
      'sourceId',
      'requiredConfirmations',
    ] as const)
      if (proof.receipt[field] !== receipt[field])
        throw Error('Zcash reward policy differs from settlement');
    // Receipts settled under the former five-second window remain immutable.
    // Reward capture has a fresh canonical observation and a bounded new age.
    if (
      proof.receipt.maximumAgeMs !== receipt.maximumAgeMs &&
      !(receipt.maximumAgeMs === 5_000 && proof.receipt.maximumAgeMs === 60_000)
    )
      throw Error('Zcash reward policy differs from settlement');
    const assertPolicyCurrent = () => {
      authority.assertPolicyCurrent();
      proof.assertPolicyCurrent();
    };
    const assertCurrent = async () => {
      assertPolicyCurrent();
      await this.store.assertCurrent(snapshot);
      await authority.assertCurrent();
      await proof.assertCurrent();
      await this.store.assertCurrent(snapshot);
      await authority.assertCurrent();
      assertPolicyCurrent();
    };
    await assertCurrent();
    return Object.freeze({
      paymentTxId: snapshot.txId,
      assertCurrent,
      assertPolicyCurrent,
    });
  }
}
