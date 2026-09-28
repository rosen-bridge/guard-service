import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {captureResultTransport,assertResultTransportProfile,type ResultTransportPolicy} from './transport-policy';

import type { NativeInspectionProvider } from '@rosen-bridge/rosen-extractor';
import type {
  BoundSignHooks,
  BoundSignProfile,
  SignResult,
} from '@rosen-bridge/tss';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import {
  SourceCheckedZcashSigner,
  ZcashPaymentEvidence,
  ZcashTransaction,
  MAX_ZATOSHIS,
  type NativePaymentProvider,
  type ZcashPaymentEvidenceReceipt,
} from '@rosen-chains/zcash-payment';

import {
  assertZcashEventPaymentSnapshot,
  type ZcashEventPaymentSnapshot,
} from './zcashEventPaymentAuthority';
import type {
  ZcashApprovedSigningCapability,
  ZcashDispatchAuthorization,
  ZcashDispatchObservation,
  ZcashPreparedSigning,
} from './zcashSigningCoordinator';

/** Trusted reserve/TSS policy, independent of transaction approval membership. */
export interface ZcashNativeSigningPolicy {
  network: 'regtest' | 'testnet' | 'mainnet';
  genesisHash: string;
  sourceId: string;
  reserveAddress: string;
  chainCode: string;
  derivationPath: readonly number[];
  publicKey: string;
  protocolVersion: string;
  resultTransport?: ResultTransportPolicy;
  effectiveThreshold: number;
  guardPublicKeys: readonly string[];
  shareIds: readonly string[];
  maxObservationAgeMs: number;
  feeFloorZat: bigint;
  maximumFeeZat: bigint;
  minimumOutputZat: bigint;
}

export interface ZcashBoundSigner {
  prepare(): Promise<BoundSignProfile>;
  sign(
    digest: string,
    profile: BoundSignProfile,
    hooks: BoundSignHooks,
  ): Promise<SignResult>;
  assertCurrent(): void;
}

interface PreparedSession {
  readonly json: string;
  readonly transaction: ZcashTransaction;
  readonly profile: BoundSignProfile;
  readonly policy: ZcashNativeSigningPolicy;
  readonly policyJson: string;
  started: boolean;
  initialReceipt?: ZcashPaymentEvidenceReceipt;
}

const capturePolicy = (
  policy: ZcashNativeSigningPolicy,
): ZcashNativeSigningPolicy => {
  const result = {
    network: policy.network,
    genesisHash: policy.genesisHash,
    sourceId: policy.sourceId,
    reserveAddress: policy.reserveAddress,
    chainCode: policy.chainCode,
    derivationPath: Object.freeze([...policy.derivationPath]),
    publicKey: policy.publicKey,
    protocolVersion: policy.protocolVersion,
    ...(policy.resultTransport===undefined?{}:{resultTransport:captureResultTransport(policy.resultTransport)}),
    effectiveThreshold: policy.effectiveThreshold,
    guardPublicKeys: Object.freeze([...policy.guardPublicKeys]),
    shareIds: Object.freeze([...policy.shareIds]),
    maxObservationAgeMs: policy.maxObservationAgeMs,
    feeFloorZat: policy.feeFloorZat,
    maximumFeeZat: policy.maximumFeeZat,
    minimumOutputZat: policy.minimumOutputZat,
  };
  if (
    !['regtest', 'testnet', 'mainnet'].includes(result.network) ||
    !/^[0-9a-f]{64}$/.test(result.genesisHash) ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(result.sourceId) ||
    !Number.isSafeInteger(result.maxObservationAgeMs) ||
    result.maxObservationAgeMs < 1 ||
    !Number.isSafeInteger(result.effectiveThreshold) ||
    result.effectiveThreshold < 1 ||
    [result.feeFloorZat, result.maximumFeeZat, result.minimumOutputZat].some(
      (value) =>
        typeof value !== 'bigint' || value < 0n || value > BigInt(MAX_ZATOSHIS),
    ) ||
    result.minimumOutputZat < 1n ||
    result.feeFloorZat > result.maximumFeeZat
  )
    throw Error('Invalid Zcash signing policy');
  return Object.freeze(result);
};

const policyJson = (policy: ZcashNativeSigningPolicy): string =>
  JSON.stringify(policy, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );

/** Native bytes, trusted intent, source observation and bound TSS; no broadcast API. */
export class ZcashNativeSigningCapability
  implements ZcashApprovedSigningCapability
{
  private readonly sessions = new WeakMap<
    ZcashPreparedSigning,
    PreparedSession
  >();
  private readonly readPolicy: () => ZcashNativeSigningPolicy;
  private readonly signer: ZcashBoundSigner;
  private readonly clock: () => number;
  private profilePromise?: Promise<BoundSignProfile>;

  constructor(
    private readonly native: NativePaymentProvider,
    private readonly inspector: NativeInspectionProvider,
    private readonly evidence: ZcashPaymentEvidence,
    signer: ZcashBoundSigner,
    policy: () => ZcashNativeSigningPolicy,
    clock: () => number = () => performance.now(),
  ) {
    if (!(evidence instanceof ZcashPaymentEvidence))
      throw Error('Invalid Zcash evidence provider');
    this.signer = Object.freeze({
      prepare: signer.prepare.bind(signer),
      sign: signer.sign.bind(signer),
      assertCurrent: signer.assertCurrent.bind(signer),
    });
    this.readPolicy = policy;
    this.clock = clock;
  }

  private assertPolicy(session: PreparedSession): void {
    if (policyJson(capturePolicy(this.readPolicy())) !== session.policyJson)
      throw Error('Zcash signing policy changed');
    this.signer.assertCurrent();
  }

  private async prepareProfileOnce(): Promise<BoundSignProfile> {
    this.signer.assertCurrent();
    // Profile assignment belongs to this capability, not to each fresh validation.
    // Publish the promise before invoking the one-shot issuer; rejection is sticky.
    this.profilePromise ??= Promise.resolve().then(() => {
      this.signer.assertCurrent();
      return this.signer.prepare();
    });
    const profile = await this.profilePromise;
    this.signer.assertCurrent();
    return profile;
  }

  private session(
    prepared: ZcashPreparedSigning,
    json: string,
  ): PreparedSession {
    const session = this.sessions.get(prepared);
    if (!session || session.json !== json)
      throw Error('Unknown Zcash prepared signing session');
    return session;
  }

  async prepareApprovedSigning(
    json: string,
    authority: ZcashEventPaymentSnapshot,
  ): Promise<ZcashPreparedSigning> {
    assertZcashEventPaymentSnapshot(authority);
    await authority.assertCurrent();
    const policy = capturePolicy(this.readPolicy());
    const proposal = ZcashTransaction.inspectProposalJson(
      json,
      this.native,
      this.inspector,
    );
    const proposed = proposal.getIntent();
    if (
      proposal.getSignedHex() !== undefined ||
      proposed.network !== policy.network ||
      proposed.reserveAddress !== policy.reserveAddress
    )
      throw Error(
        'Zcash preparation requires an unsigned payment under the reserve policy',
      );
    // This read validates the candidate branch, expiry window and actual prevout.
    // It does not make the proposed recipient or amount authoritative.
    const receipt = await this.evidence.check(proposal);
    if (
      receipt.kind !== 'consistent-source-observation' ||
      receipt.network !== policy.network ||
      receipt.genesisHash !== policy.genesisHash ||
      receipt.sourceId !== policy.sourceId ||
      receipt.candidateSha256 !==
        createHash('sha256').update(json).digest('hex') ||
      receipt.outpoint !== proposed.input.txid + ':' + proposed.input.index ||
      receipt.amountZat !== proposed.input.amountZat.toString() ||
      receipt.scriptPubKeyHex !== proposed.input.scriptPubKeyHex ||
      receipt.candidateBranchId !== proposed.branchId
    )
      throw Error('Zcash preparation source observation mismatch');
    if (proposed.orchard && (
      policy.network !== 'regtest' ||
      proposed.orchard.nativeNetwork !== 'regtest_nu6_2_at_two' ||
      proposed.orchard.targetHeight !== receipt.tipHeight + 1 ||
      proposed.orchard.compressedPubkeyHex !== policy.publicKey ||
      proposed.feeZat !== 15_000n
    ))
      throw Error('Zcash Orchard proposal differs from source or signing policy');
    const total = authority.payments.reduce(
      (sum, payment) => sum + payment.assets.nativeToken,
      0n,
    );
    const change = BigInt(receipt.amountZat) - total - proposed.feeZat;
    const conventional = BigInt(
      proposal.getDigest().zip317_conventional_fee_zat,
    );
    const requiredFee =
      conventional > policy.feeFloorZat ? conventional : policy.feeFloorZat;
    if (
      authority.eventId !== proposed.eventId ||
      authority.payments.some(
        (payment) => payment.assets.nativeToken < policy.minimumOutputZat,
      ) ||
      proposed.feeZat < requiredFee ||
      proposed.feeZat > policy.maximumFeeZat ||
      change < 0n ||
      (change > 0n &&
        (change < policy.minimumOutputZat || proposed.feeZat !== requiredFee))
    )
      throw Error('Zcash proposal differs from event or fee policy');
    const transaction = ZcashTransaction.fromJson(
      json,
      {
        network: policy.network,
        eventId: authority.eventId,
        txType: TransactionType.payment,
        reserveAddress: policy.reserveAddress,
        branchId: receipt.candidateBranchId,
        lockTime: 0,
        expiryHeight: proposed.expiryHeight,
        sequence: proposed.orchard ? 0xffffffff : 0xfffffffe,
        input: {
          txid: proposed.input.txid,
          index: proposed.input.index,
          amountZat: BigInt(receipt.amountZat),
          scriptPubKeyHex: receipt.scriptPubKeyHex,
        },
        payments: authority.payments,
        feeZat: proposed.feeZat,
        ...(proposed.orchard ? {orchard: proposed.orchard} : {}),
      },
      this.native,
      this.inspector,
    );
    const intent = transaction.getIntent();
    const profile = await this.prepareProfileOnce();
    assertResultTransportProfile(profile,policy.resultTransport);
    if (
      profile.crypto !== 'ecdsa' ||
      profile.curve !== 'secp256k1' ||
      profile.protocolVersion !== policy.protocolVersion ||
      profile.rawThreshold + 1 !== policy.effectiveThreshold ||
      profile.chainCode !== policy.chainCode ||
      JSON.stringify(profile.derivationPath) !==
        JSON.stringify(policy.derivationPath) ||
      profile.publicKey !== policy.publicKey ||
      profile.effectiveThreshold !== policy.effectiveThreshold ||
      JSON.stringify(profile.guardPublicKeys) !==
        JSON.stringify(policy.guardPublicKeys) ||
      JSON.stringify(profile.shareIds) !== JSON.stringify(policy.shareIds)
    )
      throw Error('Zcash TSS profile differs from trusted policy');
    const hash = createHash('ripemd160')
      .update(
        createHash('sha256')
          .update(Buffer.from(profile.publicKey, 'hex'))
          .digest(),
      )
      .digest('hex');
    if (intent.input.scriptPubKeyHex !== '76a914' + hash + '88ac')
      throw Error('Zcash reserve does not match the signing key');
    const inputs = Object.freeze({
      genesisHash: policy.genesisHash,
      outpoint: intent.input.txid + ':' + intent.input.index,
      sighashAll: transaction.getDigest().sighash_all,
      tssProfileHash: profile.profileHash,
    });
    const prepared = Object.freeze({ inputs });
    const session = {
      json,
      transaction,
      profile,
      policy,
      policyJson: policyJson(policy),
      started: false,
      initialReceipt: receipt,
    };
    await authority.assertCurrent();
    this.assertPolicy(session);
    this.sessions.set(prepared, session);
    return prepared;
  }

  private observation(
    session: PreparedSession,
    receipt: ZcashPaymentEvidenceReceipt,
  ): ZcashDispatchObservation {
    const intent = session.transaction.getIntent();
    const candidateSha256 = createHash('sha256')
      .update(session.json)
      .digest('hex');
    const outpoint = intent.input.txid + ':' + intent.input.index;
    if (
      receipt.kind !== 'consistent-source-observation' ||
      receipt.network !== session.policy.network ||
      receipt.genesisHash !== session.policy.genesisHash ||
      receipt.sourceId !== session.policy.sourceId ||
      receipt.candidateSha256 !== candidateSha256 ||
      receipt.outpoint !== outpoint ||
      receipt.candidateBranchId !== intent.branchId ||
      receipt.amountZat !== intent.input.amountZat.toString() ||
      receipt.scriptPubKeyHex !== intent.input.scriptPubKeyHex
    )
      throw Error('Zcash dispatch source observation mismatch');
    if (
      session.initialReceipt &&
      (receipt.previousBlockHash !== session.initialReceipt.previousBlockHash ||
        receipt.previousHeight !== session.initialReceipt.previousHeight ||
        receipt.previousBranchId !== session.initialReceipt.previousBranchId)
    )
      throw Error('Zcash dispatch previous transaction context changed');
    return Object.freeze({
      genesisHash: receipt.genesisHash,
      outpoint,
      candidateSha256,
      sighashAll: session.transaction.getDigest().sighash_all,
      tssProfileHash: session.profile.profileHash,
    });
  }

  async signApprovedTransaction(
    json: string,
    beforeMediator: (observation: ZcashDispatchObservation) => Promise<void>,
    prepared: ZcashPreparedSigning,
    authorization: ZcashDispatchAuthorization,
  ): Promise<PaymentTransaction> {
    const session = this.session(prepared, json);
    if (session.started)
      throw Error('Zcash prepared signing session was already used');
    session.started = true;
    const authorize = authorization.authorize.bind(authorization);
    const assertCurrent = authorization.assertCurrent.bind(authorization);
    const mark = beforeMediator.bind(undefined);
    this.assertPolicy(session);
    let observedAt: number | undefined;
    const mediator = {
      isInSign: async () => false,
      sign: async (digest: Uint8Array) => {
        if (Buffer.from(digest).toString('hex') !== prepared.inputs.sighashAll)
          throw Error('Zcash mediator digest mismatch');
        const result = await this.signer.sign(
          prepared.inputs.sighashAll,
          session.profile,
          {
            authorize: async (profile) => {
              if (profile !== session.profile)
                throw Error('Zcash queued profile mismatch');
              this.assertPolicy(session);
              observedAt = undefined;
              const start = this.clock();
              const receipt = await this.evidence.check(session.transaction);
              await authorize(this.observation(session, receipt));
              this.assertPolicy(session);
              observedAt = start;
            },
            assertCurrent: (profile) => {
              if (profile !== session.profile)
                throw Error('Zcash queued profile mismatch');
              assertCurrent();
              this.assertPolicy(session);
              const age = this.clock() - (observedAt ?? NaN);
              if (
                !Number.isFinite(age) ||
                age < 0 ||
                age > session.policy.maxObservationAgeMs
              )
                throw Error('Zcash dispatch observation expired');
            },
          },
        );
        return {
          signature: result.signature,
          signatureRecovery: result.signatureRecovery!,
        };
      },
    };
    const checked = new SourceCheckedZcashSigner(
      this.evidence,
      this.native,
      this.inspector,
      mediator,
      session.profile.publicKey,
    );
    return checked.sign(
      session.transaction,
      session.transaction.getIntent(),
      async (dispatch) => {
        if (dispatch.sighashAll !== prepared.inputs.sighashAll)
          throw Error('Zcash initial digest mismatch');
        this.assertPolicy(session);
        const observation = this.observation(session, dispatch.evidenceReceipt);
        session.initialReceipt = dispatch.evidenceReceipt;
        await mark(observation);
        this.assertPolicy(session);
        assertCurrent();
      },
    );
  }

  validateSignedAgainstApproval(
    signed: PaymentTransaction,
    json: string,
    prepared: ZcashPreparedSigning,
  ): PaymentTransaction {
    const session = this.session(prepared, json);
    const result = ZcashTransaction.fromJson(
      signed.toJson(),
      session.transaction.getIntent(),
      this.native,
      this.inspector,
    );
    if (
      !session.started ||
      result.getSignedHex() === undefined ||
      result.getUnsignedHex() !== session.transaction.getUnsignedHex()
    )
      throw Error('Invalid native Zcash signing result');
    return result;
  }
}
