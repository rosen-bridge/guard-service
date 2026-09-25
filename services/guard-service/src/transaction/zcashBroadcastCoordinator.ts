import { isEqual } from 'lodash-es';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import type { PaymentOrder } from '@rosen-chains/abstract-chain';
import type {
  ZcashTransactionObservation,
  ZcashSubmissionGuard,
} from '@rosen-chains/zcash';

import {
  assertApprovalBinding,
  assertApprovalPolicy,
  verifyTransactionApproval,
  type TransactionApprovalPolicy,
} from '../agreement/transactionApproval';
import { ZcashBroadcastStore } from '../db/zcashBroadcastStore';
import {
  ZcashConfirmationAuthority,
  type ZcashConfirmationSource,
} from './zcashConfirmationAuthority';
import { ZcashEventPaymentAuthority } from './zcashEventPaymentAuthority';
import { ZcashEventRewardAuthority } from './zcashEventRewardAuthority';
import type { ZcashSigningBinding } from './zcashSigningContext';

export interface ZcashBroadcastCapability extends ZcashConfirmationSource {
  validate(binding: ZcashSigningBinding, signedJson: string): PaymentOrder;
  observe(signedJson: string): Promise<ZcashTransactionObservation>;
  submit(signedJson: string, guard: ZcashSubmissionGuard): Promise<void>;
}

export type ZcashBroadcastOutcome =
  | ZcashTransactionObservation
  | {
      readonly kind: 'submission-returned';
      readonly txId: string;
    }
  | {
      readonly kind: 'settled';
      readonly txId: string;
    };

// Serialize this process's work for one row. Cross-process recovery permits
// repeated submission of identical bytes; this is not an exactly-once lease.
const queues = new WeakMap<DataSource, Map<string, Promise<unknown>>>();

export class ZcashBroadcastCoordinator {
  private readonly store: ZcashBroadcastStore;
  private readonly authority: ZcashEventPaymentAuthority;
  private readonly capability: ZcashBroadcastCapability;
  private readonly confirmation: ZcashConfirmationAuthority;
  private readonly rewardAuthority: ZcashEventRewardAuthority;

  constructor(
    private readonly source: DataSource,
    capability: ZcashBroadcastCapability,
    private readonly policy: () => TransactionApprovalPolicy,
    private readonly verifier: Parameters<typeof verifyTransactionApproval>[2],
  ) {
    for (const method of ['validate', 'observe', 'submit', 'policy'] as const)
      if (typeof capability?.[method] !== 'function')
        throw Error('Zcash broadcast capability is unavailable');
    this.capability = Object.freeze({
      validate: capability.validate.bind(capability),
      observe: capability.observe.bind(capability),
      submit: capability.submit.bind(capability),
      policy: capability.policy.bind(capability),
    });
    this.store = new ZcashBroadcastStore(source);
    this.authority = new ZcashEventPaymentAuthority(source);
    this.confirmation = new ZcashConfirmationAuthority(this.capability);
    this.rewardAuthority = new ZcashEventRewardAuthority(source);
  }

  /** Caller rows and caller JSON never select the retained payment bytes. */
  process(txId: string): Promise<ZcashBroadcastOutcome> {
    if (typeof txId !== 'string' || !/^[0-9a-f]{64}$/.test(txId))
      return Promise.reject(Error('Invalid Zcash broadcast transaction ID'));
    let queue = queues.get(this.source);
    if (!queue) {
      queue = new Map();
      queues.set(this.source, queue);
    }
    const previous = queue.get(txId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => this.run(txId));
    queue.set(txId, next);
    void next
      .finally(() => {
        if (queue.get(txId) === next) queue.delete(txId);
      })
      .catch(() => undefined);
    return next;
  }

  private async run(txId: string): Promise<ZcashBroadcastOutcome> {
    let snapshot = await this.store.load(txId);
    if (snapshot.status === 'completed')
      return Object.freeze({ kind: 'settled', txId: snapshot.txId });
    const payments = this.capability.validate(
      snapshot.binding,
      snapshot.signedTxJson,
    );
    await this.store.assertCurrent(snapshot);
    const observed = await this.capability.observe(snapshot.signedTxJson);
    await this.store.assertCurrent(snapshot);
    if (observed.kind !== 'absent') {
      if (observed.txId !== snapshot.txId)
        throw Error('Zcash broadcast observation identity mismatch');
      snapshot = await this.store.markObserved(snapshot);
      if (
        observed.kind === 'confirmed' &&
        observed.confirmations >= this.capability.policy().requiredConfirmations
      ) {
        const authority = await this.rewardAuthority.capture(snapshot.eventId);
        if (!isEqual(payments, authority.payments))
          throw Error(
            'Zcash settlement payment no longer matches event authority',
          );
        const proof = await this.confirmation.capture(
          snapshot,
          authority.eventContextJson,
        );
        if (proof) {
          await this.store.settleConfirmed(snapshot, proof, authority);
          return Object.freeze({ kind: 'settled', txId: snapshot.txId });
        }
      }
      return observed;
    }

    // Observation above remains available after revocation. Only new submission
    // needs current quorum, event, token/fee policy and unspent source evidence.
    const approval = await verifyTransactionApproval(
      snapshot.binding.approvalEvidence,
      this.policy(),
      this.verifier,
    );
    assertApprovalBinding(
      approval,
      snapshot.binding.approvedTxJson,
      snapshot.binding.requiredSign,
    );
    const authority = await this.authority.capture(snapshot.eventId);
    if (!isEqual(payments, authority.payments))
      throw Error('Zcash broadcast payment no longer matches event authority');
    await authority.assertCurrent();
    await this.store.assertCurrent(snapshot);
    await this.capability.submit(snapshot.signedTxJson, {
      authorize: async () => {
        assertApprovalPolicy(approval, this.policy());
        authority.assertPolicyCurrent();
        snapshot = await this.store.reserveSubmission(snapshot, authority);
      },
      assertCurrent: () => {
        // Synchronous transport callback after the reservation await, adjacent
        // to dispatch. Later uncertainty retains sent and the signed bytes.
        assertApprovalPolicy(approval, this.policy());
        authority.assertPolicyCurrent();
      },
    });
    await this.store.assertCurrent(snapshot);
    return Object.freeze({ kind: 'submission-returned', txId: snapshot.txId });
  }
}
