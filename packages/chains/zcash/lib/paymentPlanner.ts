import { AbstractBoxSelection } from '@rosen-bridge/abstract-box-selection';
import { createHash } from 'node:crypto';
import { createZcashAddressCodec } from '@rosen-bridge/address-codec-zcash';
import {
  NotEnoughValidBoxesError,
  TransactionType,
  type BoxInfo,
  type PaymentOrder,
} from '@rosen-chains/abstract-chain';
import type { NativeInspectionProvider } from '@rosen-bridge/rosen-extractor';
import {
  ZcashPaymentEvidence,
  ZcashPaymentEvidenceError,
  ZcashTransaction,
  MAX_PAYMENT_OUTPUTS,
  type NativePaymentProvider,
  type ZcashPaymentEvidenceReceipt,
  type ZcashPaymentIntent,
  type ZcashSourcePolicy,
} from '@rosen-chains/zcash-payment';
import {
  ZcashUtxoSnapshot,
  type ZcashDiscoverySource,
  type ZcashUtxo,
} from './utxoSnapshot.js';

const UINT32_MAX = 0xffff_ffff;
const EXPIRY_HEIGHT_MAX = 499_999_999;
const PAGE_SIZE = 100;
const BOX_ID = /^([0-9a-f]{64})\.([0-9]+)$/;
const INELIGIBLE_EVIDENCE = new Set([
  'unavailable_prevout',
  'unsupported_coinbase',
  'insufficient_confirmations',
]);

export class ZcashPaymentPlannerError extends Error {
  constructor(readonly code: string) {
    super(`Zcash payment planner ${code} failure`);
    this.name = 'ZcashPaymentPlannerError';
  }
}

export interface ZcashPaymentPlan {
  readonly transaction: ZcashTransaction;
  readonly evidence: ZcashPaymentEvidenceReceipt;
}

export interface ZcashPaymentPlannerOptions {
  readonly source: ZcashDiscoverySource;
  readonly policy: ZcashSourcePolicy;
  readonly native: NativePaymentProvider;
  readonly inspector: NativeInspectionProvider;
  readonly reserveAddress: string;
  readonly reserveCompressedPubkeyHex?: string;
  readonly feeFloorZat: bigint;
  readonly maximumFeeZat: bigint;
  readonly expiryDelta: number;
  readonly minimumOutputZat?: bigint;
  readonly maxUtxos?: number;
  readonly maxAgeMs?: number;
  readonly now?: () => number;
}

interface EligibleCandidate {
  readonly box: ZcashUtxo;
  readonly transaction: ZcashTransaction;
  readonly evidence: ZcashPaymentEvidenceReceipt;
  readonly fee: bigint;
}

class ZcashBoxSelection extends AbstractBoxSelection<EligibleCandidate> {
  getBoxInfo = (candidate: EligibleCandidate): BoxInfo => ({
    id: `${candidate.box.txId}.${candidate.box.index}`,
    assets: { nativeToken: candidate.box.value, tokens: [] },
  });
}

function reject(code: string): never {
  throw new ZcashPaymentPlannerError(code);
}

function uint(value: unknown, maximum = UINT32_MAX): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
      value > maximum || Object.is(value, -0)) reject('configuration');
  return value;
}

function amount(value: unknown, positive: boolean, code = 'configuration'): bigint {
  if (typeof value !== 'bigint' || value < (positive ? 1n : 0n)) reject(code);
  return value;
}

function copyPayments(order: PaymentOrder): PaymentOrder {
  if (!Array.isArray(order) || order.length === 0) reject('payments');
  return order.map((payment) => {
    if (payment === null || typeof payment !== 'object' || Array.isArray(payment) ||
        typeof payment.address !== 'string' || payment.extra !== undefined ||
        payment.assets === null || typeof payment.assets !== 'object' ||
        !Array.isArray(payment.assets.tokens) || payment.assets.tokens.length !== 0) reject('payments');
    return Object.freeze({
      address: payment.address,
      assets: {nativeToken: amount(payment.assets.nativeToken, true, 'payments'), tokens: []},
    });
  });
}

function copyForbidden(ids: string[]): string[] {
  if (!Array.isArray(ids)) reject('forbidden_boxes');
  const unique = new Set<string>();
  for (const id of ids) {
    const match = typeof id === 'string' ? BOX_ID.exec(id) : null;
    if (!match) reject('forbidden_boxes');
    const index = Number(match[2]);
    if (!Number.isSafeInteger(index) || index < 0 || index > UINT32_MAX) reject('forbidden_boxes');
    unique.add(`${match[1]}.${index}`);
  }
  return Array.from(unique);
}

function bindSource(source: ZcashDiscoverySource): ZcashDiscoverySource {
  const result = {} as ZcashDiscoverySource;
  const methods = [
    'getGenesisHash', 'getBlockchainInfo', 'getTxOut', 'getBlockHash',
    'getTransaction', 'getAddressUtxos',
  ] as const;
  for (const method of methods) {
    if (typeof source?.[method] !== 'function') reject('configuration');
    Object.defineProperty(result, method, {value: source[method].bind(source), enumerable: true});
  }
  return Object.freeze(result);
}

function bindNative(native: NativePaymentProvider): NativePaymentProvider {
  if (typeof native?.construct !== 'function' || typeof native.digest !== 'function' ||
      typeof native.finalize !== 'function') reject('configuration');
  const orchardMethods = [native.orchardPrepare, native.orchardVerify,
    native.orchardFinalize, native.orchardVerifySigned];
  if (orchardMethods.some(method => method !== undefined) &&
      orchardMethods.some(method => typeof method !== 'function')) reject('configuration');
  return Object.freeze({
    construct: native.construct.bind(native),
    digest: native.digest.bind(native),
    finalize: native.finalize.bind(native),
    ...(typeof native.orchardPrepare === 'function' ? {
      orchardPrepare: native.orchardPrepare.bind(native),
      orchardVerify: native.orchardVerify!.bind(native),
      orchardFinalize: native.orchardFinalize!.bind(native),
      orchardVerifySigned: native.orchardVerifySigned!.bind(native),
    } : {}),
  });
}

function bindInspector(inspector: NativeInspectionProvider): NativeInspectionProvider {
  if (typeof inspector?.inspect !== 'function') reject('configuration');
  return Object.freeze({inspect: inspector.inspect.bind(inspector)});
}

/** Plans one native-supported, one-input payment from one immutable discovery snapshot. */
export class ZcashPaymentPlanner {
  readonly #source: ZcashDiscoverySource;
  readonly #policy: ZcashSourcePolicy;
  readonly #native: NativePaymentProvider;
  readonly #inspector: NativeInspectionProvider;
  readonly #reserveAddress: string;
  readonly #reserveCompressedPubkeyHex: string | undefined;
  readonly #feeFloor: bigint;
  readonly #maximumFee: bigint;
  readonly #expiryDelta: number;
  readonly #minimumOutput: bigint;
  readonly #maxUtxos: number | undefined;
  readonly #maxAgeMs: number | undefined;
  readonly #now: (() => number) | undefined;

  constructor(options: ZcashPaymentPlannerOptions) {
    if (options === null || typeof options !== 'object' || typeof options.reserveAddress !== 'string') reject('configuration');
    this.#source = bindSource(options.source);
    this.#native = bindNative(options.native);
    this.#inspector = bindInspector(options.inspector);
    if (options.policy === null || typeof options.policy !== 'object' || !Array.isArray(options.policy.branches)) reject('configuration');
    this.#policy = Object.freeze({
      network: options.policy.network,
      genesisHash: options.policy.genesisHash,
      sourceId: options.policy.sourceId,
      branches: Object.freeze(options.policy.branches.map((branch) => Object.freeze({...branch}))),
      minimumConfirmations: options.policy.minimumConfirmations,
      maximumExpiryDelta: options.policy.maximumExpiryDelta,
    });
    this.#reserveAddress = options.reserveAddress;
    if (options.reserveCompressedPubkeyHex !== undefined) {
      const pubkey = options.reserveCompressedPubkeyHex;
      if (typeof pubkey !== 'string' || !/^(02|03)[0-9a-f]{64}$/.test(pubkey)) reject('configuration');
      const script = createZcashAddressCodec(this.#policy.network).parseAddress(this.#reserveAddress).scriptPubKeyHex;
      const hash = createHash('ripemd160').update(createHash('sha256').update(Buffer.from(pubkey, 'hex')).digest()).digest('hex');
      if (script !== `76a914${hash}88ac`) reject('configuration');
      this.#reserveCompressedPubkeyHex = pubkey;
    }
    this.#feeFloor = amount(options.feeFloorZat, false);
    this.#maximumFee = amount(options.maximumFeeZat, false);
    if (this.#maximumFee < this.#feeFloor) reject('configuration');
    this.#expiryDelta = uint(options.expiryDelta, EXPIRY_HEIGHT_MAX);
    if (this.#expiryDelta < 1 || this.#expiryDelta > this.#policy.maximumExpiryDelta) reject('configuration');
    this.#minimumOutput = options.minimumOutputZat === undefined ? 1n : amount(options.minimumOutputZat, true);
    this.#maxUtxos = options.maxUtxos;
    this.#maxAgeMs = options.maxAgeMs;
    if (options.now !== undefined && typeof options.now !== 'function') reject('configuration');
    this.#now = options.now?.bind(options);
    // Validate the copied evidence policy and bound callbacks before the first plan.
    new ZcashPaymentEvidence(this.#source, this.#inspector, this.#policy);
    Object.freeze(this);
  }

  async plan(eventId: string, txType: TransactionType, nativeZatoshiOrder: PaymentOrder,
    forbiddenBoxIds: string[]): Promise<ZcashPaymentPlan> {
    const frozenEventId = eventId;
    const frozenType = txType;
    const payments = copyPayments(nativeZatoshiOrder);
    const codec = createZcashAddressCodec(this.#policy.network);
    const recipients = payments.map(payment => codec.parseRecipient(payment.address));
    const orchard = recipients.some(recipient => recipient.kind === 'orchard');
    const regtestNu62 = this.#policy.network === 'regtest' &&
      JSON.stringify(this.#policy.branches) === JSON.stringify([
        {height: 0, branchId: '00000000'},
        {height: 1, branchId: 'e9ff75a6'},
        {height: 2, branchId: '5437f330'},
      ]);
    if (orchard && (payments.length !== 1 || recipients[0].kind !== 'orchard' ||
        !regtestNu62 ||
        this.#reserveCompressedPubkeyHex === undefined ||
        typeof this.#native.orchardPrepare !== 'function' ||
        this.#feeFloor > 15_000n || this.#maximumFee < 15_000n ||
        (this.#maxAgeMs !== undefined && this.#maxAgeMs < 90_000))) reject('orchard_policy');
    const forbidden = copyForbidden(forbiddenBoxIds);
    const forbiddenSet = new Set(forbidden);
    if (payments.some(payment => payment.assets.nativeToken < this.#minimumOutput)) reject('payments');
    const required = payments.reduce((sum, payment) => sum + payment.assets.nativeToken, 0n);
    const snapshot = await ZcashUtxoSnapshot.capture({
      source: this.#source,
      policy: this.#policy,
      address: this.#reserveAddress,
      maxUtxos: this.#maxUtxos,
      // Release-mode Orchard proving can outlast the transparent 30-second lease.
      // Evidence still re-reads the chain context and prevout after construction.
      maxAgeMs: orchard ? (this.#maxAgeMs ?? 90_000) : this.#maxAgeMs,
      now: this.#now,
    });
    const expiryHeight = snapshot.tipHeight + (orchard ? Math.min(this.#expiryDelta, 40) : this.#expiryDelta);
    if (!Number.isSafeInteger(expiryHeight) || expiryHeight > EXPIRY_HEIGHT_MAX) reject('expiry');
    if (orchard && (snapshot.tipHeight < 2 || snapshot.nextBranchId !== '5437f330')) reject('orchard_branch');
    const evidence = new ZcashPaymentEvidence(this.#source, this.#inspector, this.#policy);
    const candidates = new Map<string, EligibleCandidate>();
    let sawFeeCap = false;

    const makeIntent = (box: ZcashUtxo, feeZat: bigint): ZcashPaymentIntent => ({
      network: this.#policy.network,
      eventId: frozenEventId,
      txType: frozenType,
      reserveAddress: this.#reserveAddress,
      branchId: snapshot.nextBranchId,
      lockTime: 0,
      expiryHeight,
      sequence: orchard ? 0xffff_ffff : 0xffff_fffe,
      input: {txid: box.txId, index: box.index, amountZat: box.value, scriptPubKeyHex: box.scriptPubKeyHex},
      payments,
      feeZat,
      ...(orchard ? {orchard: {
        nativeNetwork: 'regtest_nu6_2_at_two' as const,
        targetHeight: snapshot.tipHeight + 1,
        compressedPubkeyHex: this.#reserveCompressedPubkeyHex!,
      }} : {}),
    });

    const qualify = (box: ZcashUtxo, fee: bigint, transaction?: ZcashTransaction):
      {transaction: ZcashTransaction; fee: bigint} | undefined => {
      if (fee > this.#maximumFee || box.value < required + fee) return undefined;
      const candidate = transaction ?? ZcashTransaction.create(makeIntent(box, fee), this.#native, this.#inspector);
      const digest = candidate.getDigest();
      if (BigInt(digest.actual_fee_zat) !== fee || BigInt(digest.zip317_conventional_fee_zat) > fee) return undefined;
      const change = box.value - required - fee;
      if (change < 0n || (change > 0n && change < this.#minimumOutput)) return undefined;
      return {transaction: candidate, fee};
    };

    const quote = (box: ZcashUtxo): {transaction: ZcashTransaction; fee: bigint} | undefined => {
      const spare = box.value - required;
      if (orchard) {
        if (spare - 15_000n < this.#minimumOutput) return undefined;
        const qualified = qualify(box, 15_000n);
        if (!qualified) reject('orchard_quote');
        return qualified;
      }
      if (spare < this.#feeFloor) return undefined;
      let capExceeded = false;

      // Qualify a positive-change shape first. Its output count stays fixed while the fee rises.
      const floorChange = spare - this.#feeFloor;
      if (payments.length < MAX_PAYMENT_OUTPUTS && floorChange >= this.#minimumOutput) {
        const floorCandidate = ZcashTransaction.create(makeIntent(box, this.#feeFloor), this.#native, this.#inspector);
        const conventional = BigInt(floorCandidate.getDigest().zip317_conventional_fee_zat);
        const fee = conventional > this.#feeFloor ? conventional : this.#feeFloor;
        if (fee > this.#maximumFee) capExceeded = true;
        else if (spare - fee >= this.#minimumOutput) {
          const qualified = qualify(box, fee, fee === this.#feeFloor ? floorCandidate : undefined);
          if (!qualified) reject('fee_quote');
          return {transaction: qualified.transaction, fee};
        }
      }

      // An exact no-change shape has a different native conventional fee and is quoted independently.
      // A remainder below the local output minimum may be consumed as fee only within the explicit cap.
      if (spare <= this.#maximumFee) {
        const qualified = qualify(box, spare);
        if (qualified) return {transaction: qualified.transaction, fee: spare};
      } else capExceeded = true;

      // A cap applies to this input's shape. Remember it while allowing later inputs to qualify.
      if (capExceeded) sawFeeCap = true;
      return undefined;
    };

    const iterator = async function* (): AsyncGenerator<EligibleCandidate, undefined> {
      let offset = 0;
      while (true) {
        snapshot.assertFresh();
        const page = await snapshot.getAddressBoxes(snapshot.address, offset, PAGE_SIZE);
        if (page.length === 0) return undefined;
        for (const box of page) {
          snapshot.assertFresh();
          if (forbiddenSet.has(`${box.txId}.${box.index}`)) continue;
          const made = quote(box);
          if (!made) continue;
          let receipt: ZcashPaymentEvidenceReceipt;
          try {
            receipt = await evidence.check(made.transaction);
          } catch (error) {
            if (error instanceof ZcashPaymentEvidenceError && INELIGIBLE_EVIDENCE.has(error.code)) continue;
            throw error;
          }
          snapshot.assertFresh();
          if (receipt.tipHeight !== snapshot.tipHeight || receipt.tipHash !== snapshot.tipHash) reject('snapshot_join');
          if (receipt.previousHeight !== box.height) reject('prevout_height_join');
          const candidate = Object.freeze({box, transaction: made.transaction, evidence: receipt, fee: made.fee});
          candidates.set(`${box.txId}.${box.index}`, candidate);
          yield candidate;
        }
        offset += page.length;
        if (page.length < PAGE_SIZE) return undefined;
      }
    }();

    const result = await new ZcashBoxSelection().getCoveringBoxes(
      {nativeToken: required, tokens: []},
      forbidden,
      new Map<string, EligibleCandidate | undefined>(),
      iterator,
      0n,
      1,
      (selected) => selected[0]?.fee ?? this.#feeFloor,
    );
    snapshot.assertFresh();
    if (!result.covered) {
      if (sawFeeCap) reject('fee_cap');
      throw new NotEnoughValidBoxesError('No individually eligible Zcash input covers the payment');
    }
    if (result.boxes.length !== 1) reject('selection_cardinality');
    const selected = result.boxes[0];
    const id = `${selected.box.txId}.${selected.box.index}`;
    if (candidates.get(id) !== selected) reject('selection_join');
    return Object.freeze({transaction: selected.transaction, evidence: selected.evidence});
  }
}
