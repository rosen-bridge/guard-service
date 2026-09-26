import { createHash, randomUUID } from 'node:crypto';

import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import {
  assertApprovalBinding,
  assertApprovalPolicy,
  TransactionApprovalPolicy,
  verifyTransactionApproval,
} from '../agreement/transactionApproval';
import { TransactionEntity } from '../db/entities/transactionEntity';
import { ZcashSigningAttemptStore } from '../db/zcashSigningAttemptStore';
import { TransactionStatus } from '../utils/constants';
import {
  ZcashEventPaymentAuthority,
  type ZcashEventPaymentSnapshot,
} from './zcashEventPaymentAuthority';
import {
  assertZcashPaymentIdentity,
  decodeZcashSigningBinding,
  encodeZcashSigningBinding,
} from './zcashSigningContext';

export interface ZcashSigningInputs {
  readonly genesisHash: string;
  readonly outpoint: string;
  readonly sighashAll: string;
  readonly tssProfileHash: string;
}

export interface ZcashDispatchObservation extends ZcashSigningInputs {
  readonly candidateSha256: string;
}

/** Identity is issued and checked by the capability; serialized inputs alone do not qualify it. */
export interface ZcashPreparedSigning {
  readonly inputs: ZcashSigningInputs;
}

export interface ZcashDispatchAuthorization {
  authorize(observation: ZcashDispatchObservation): Promise<void>;
  assertCurrent(): void;
}

export interface ZcashReservedSigning {
  readonly attemptId: string;
  assertCurrent(): Promise<void>;
  continue(): Readonly<{ attemptId: string; completion: Promise<void> }>;
}

/** Implemented by the registered native Zcash chain, never by transaction data. */
export interface ZcashApprovedSigningCapability {
  prepareApprovedSigning(
    approvedTxJson: string,
    authority: ZcashEventPaymentSnapshot,
  ): Promise<ZcashPreparedSigning>;
  signApprovedTransaction(
    approvedTxJson: string,
    beforeMediator: (observation: ZcashDispatchObservation) => Promise<void>,
    prepared: ZcashPreparedSigning,
    authorization: ZcashDispatchAuthorization,
  ): Promise<PaymentTransaction>;
  validateSignedAgainstApproval(
    signed: PaymentTransaction,
    approvedTxJson: string,
    prepared: ZcashPreparedSigning,
  ): PaymentTransaction;
}

type ApprovalVerifier = Parameters<typeof verifyTransactionApproval>[2];

/** Owns durable attempts; chain capability owns native bytes and the bound TSS path. */
export class ZcashSigningCoordinator {
  private readonly store: ZcashSigningAttemptStore;
  private readonly capability: ZcashApprovedSigningCapability;
  private readonly eventAuthority: ZcashEventPaymentAuthority;

  constructor(
    private readonly dataSource: DataSource,
    capability: ZcashApprovedSigningCapability,
    private readonly policy: () => TransactionApprovalPolicy,
    private readonly verifier: ApprovalVerifier,
  ) {
    for (const method of [
      'prepareApprovedSigning',
      'signApprovedTransaction',
      'validateSignedAgainstApproval',
    ] as const)
      if (typeof capability?.[method] !== 'function')
        throw Error('Zcash approved signing capability is unavailable');
    this.capability = Object.freeze({
      prepareApprovedSigning:
        capability.prepareApprovedSigning.bind(capability),
      signApprovedTransaction:
        capability.signApprovedTransaction.bind(capability),
      validateSignedAgainstApproval:
        capability.validateSignedAgainstApproval.bind(capability),
    });
    this.store = new ZcashSigningAttemptStore(dataSource);
    this.eventAuthority = new ZcashEventPaymentAuthority(dataSource);
  }

  async reserve(row: TransactionEntity): Promise<ZcashReservedSigning> {
    const txId = row.txId;
    const eventId = row.event?.id;
    const approvedTxJson = row.txJson;
    const approvalEvidence = row.approvalEvidence;
    const requiredSign = row.requiredSign;
    if (
      row.chain !== 'zcash' ||
      row.type !== TransactionType.payment ||
      row.status !== TransactionStatus.approved ||
      row.signingAttemptId != null ||
      eventId === undefined ||
      row.order != null ||
      approvalEvidence == null
    )
      throw Error('Zcash signing requires an unclaimed approved payment');
    assertZcashPaymentIdentity(approvedTxJson, { txId, eventId });
    const approval = await verifyTransactionApproval(
      approvalEvidence,
      this.policy(),
      this.verifier,
    );
    assertApprovalBinding(approval, approvedTxJson, requiredSign);
    const authority = await this.eventAuthority.capture(eventId);
    const prepared = await this.capability.prepareApprovedSigning(
      approvedTxJson,
      authority,
    );
    const inputs = prepared.inputs;
    const binding = decodeZcashSigningBinding(
      encodeZcashSigningBinding({
        schema: 1,
        txId,
        eventId,
        approvedTxJson,
        approvalEvidence,
        requiredSign,
        genesisHash: inputs.genesisHash,
        outpoint: inputs.outpoint,
        sighashAll: inputs.sighashAll,
        tssProfileHash: inputs.tssProfileHash,
      }),
    );
    await authority.assertCurrent();
    assertApprovalPolicy(approval, this.policy());
    const attemptId = randomUUID();
    await this.store.claim(attemptId, binding, authority);
    const assertReservedRow = async (): Promise<void> => {
      const current = await this.dataSource
        .getRepository(TransactionEntity)
        .findOne({ relations: ['event', 'order'], where: { txId } });
      if (
        !current ||
        current.chain !== 'zcash' ||
        current.type !== TransactionType.payment ||
        current.status !== TransactionStatus.inSign ||
        current.signingAttemptId !== attemptId ||
        current.event?.id !== eventId ||
        current.order != null ||
        current.txJson !== approvedTxJson ||
        current.approvalEvidence !== approvalEvidence ||
        current.requiredSign !== requiredSign
      )
        throw Error('Zcash reserved signing row changed');
      const active = await this.store.getActive(txId);
      if (
        !active ||
        active.attemptId !== attemptId ||
        active.txId !== txId ||
        active.activeTxId !== txId ||
        active.eventKey !== `zcash:payment:${eventId}` ||
        active.inputKey !== `${binding.genesisHash}:${binding.outpoint}` ||
        active.bindingJson !== encodeZcashSigningBinding(binding) ||
        active.state !== 'prepared' ||
        active.signedJson !== null
      )
        throw Error('Zcash reserved signing attempt changed');
    };
    const assertFreshCurrent = async (): Promise<void> => {
      await assertReservedRow();
      await authority.assertCurrent();
      assertApprovalPolicy(approval, this.policy());
      const fresh = await this.capability.prepareApprovedSigning(
        approvedTxJson,
        authority,
      );
      if (
        fresh.inputs.genesisHash !== prepared.inputs.genesisHash ||
        fresh.inputs.outpoint !== prepared.inputs.outpoint ||
        fresh.inputs.sighashAll !== prepared.inputs.sighashAll ||
        fresh.inputs.tssProfileHash !== prepared.inputs.tssProfileHash
      )
        throw Error('Zcash reserved signing inputs changed');
      await authority.assertCurrent();
      assertApprovalPolicy(approval, this.policy());
      await assertReservedRow();
    };
    let continued = false;
    let checks = Promise.resolve();
    const check = (): Promise<void> => {
      if (continued)
        return Promise.reject(Error('Zcash reservation was already continued'));
      const current = checks.then(assertFreshCurrent);
      checks = current.catch(() => undefined);
      return current;
    };
    const continueReserved = (): Readonly<{
      attemptId: string;
      completion: Promise<void>;
    }> => {
      if (continued) throw Error('Zcash reservation was already continued');
      continued = true;
      let gateEntered = false;
      let gateCompleted = false;
      let terminated = false;
      const assertObservation = (observation: ZcashDispatchObservation) => {
        if (
          observation.genesisHash !== binding.genesisHash ||
          observation.outpoint !== binding.outpoint ||
          observation.sighashAll !== binding.sighashAll ||
          observation.tssProfileHash !== binding.tssProfileHash ||
          observation.candidateSha256 !==
            createHash('sha256').update(approvedTxJson).digest('hex')
        )
          throw Error('Zcash dispatch differs from reserved signing input');
      };
      const assertCurrent = () => {
        if (!gateCompleted || terminated)
          throw Error('Zcash signing attempt is not dispatchable');
        assertApprovalPolicy(approval, this.policy());
        authority.assertPolicyCurrent();
      };
      const authorization: ZcashDispatchAuthorization = Object.freeze({
        authorize: async (observation: ZcashDispatchObservation) => {
          assertCurrent();
          assertObservation(observation);
          await this.store.assertMayDispatchCurrent(
            attemptId,
            binding,
            authority,
          );
          assertCurrent();
        },
        assertCurrent,
      });
      const completion = checks
        .then(async () => {
          await assertFreshCurrent();
          assertApprovalPolicy(approval, this.policy());
          authority.assertPolicyCurrent();
          const signed = await this.capability.signApprovedTransaction(
            approvedTxJson,
            async (observation) => {
              if (gateEntered)
                throw Error('Zcash attempt gate was already used');
              gateEntered = true;
              assertObservation(observation);
              assertApprovalPolicy(approval, this.policy());
              authority.assertPolicyCurrent();
              await this.store.markMayDispatch(attemptId, binding, authority);
              // A policy change during the DB await must stop dispatch. Custody
              // stays uncertain once the durable marker has been committed.
              assertApprovalPolicy(approval, this.policy());
              authority.assertPolicyCurrent();
              gateCompleted = true;
            },
            prepared,
            authorization,
          );
          const validated = this.capability.validateSignedAgainstApproval(
            signed,
            approvedTxJson,
            prepared,
          );
          if (!(validated instanceof PaymentTransaction))
            throw Error('Zcash chain returned an invalid signed model');
          const signedTxJson = validated.toJson();
          assertZcashPaymentIdentity(signedTxJson, binding);
          // Persist before any optional height RPC or subsequent processing.
          await this.store.complete(attemptId, binding, signedTxJson);
        })
        .catch(async (error: unknown) => {
          try {
            await this.store.abandonPrepared(attemptId, binding);
          } catch {
            // may_dispatch/signed or uncertain storage: retain the reservation.
          }
          throw error;
        })
        .finally(() => {
          terminated = true;
        });
      return Object.freeze({ attemptId, completion });
    };
    return Object.freeze({
      attemptId,
      assertCurrent: check,
      continue: continueReserved,
    });
  }

  async start(
    row: TransactionEntity,
  ): Promise<{ attemptId: string; completion: Promise<void> }> {
    return (await this.reserve(row)).continue();
  }
}
