import { createHash } from 'node:crypto';

import type { PaymentOrder } from '@rosen-chains/abstract-chain';
import type { ZcashTransactionObservation } from '@rosen-chains/zcash';

import {
  assertZcashPaymentIdentity,
  decodeZcashSigningBinding,
  encodeZcashSigningBinding,
  type ZcashSigningBinding,
} from './zcashSigningContext';

const UINT32_MAX = 0xffff_ffff;
const MAX_ZATOSHIS = 2_100_000_000_000_000n;
const MAX_MODEL_JSON = 4_000_000;
const MAX_CONTEXT_JSON = 4_000_000;
// A canonical context may contain escaped string content which is escaped again
// when embedded as a receipt string.
const MAX_RECEIPT_JSON = 8_010_000;
const MAX_AGE_MS = 300_000;

type RecordValue = Record<string, unknown>;
type Network = 'mainnet' | 'testnet' | 'regtest';

export interface ZcashConfirmationPolicy {
  readonly network: Network;
  readonly genesisHash: string;
  readonly sourceId: string;
  readonly requiredConfirmations: number;
  readonly maximumAgeMs: number;
}

export interface ZcashConfirmationSource {
  validate(binding: ZcashSigningBinding, signedJson: string): PaymentOrder;
  observe(signedJson: string): Promise<ZcashTransactionObservation>;
  policy(): ZcashConfirmationPolicy;
}

export interface ZcashSettlementReceipt {
  readonly schema: 1;
  readonly txId: string;
  readonly eventId: string;
  readonly attemptId: string;
  readonly network: Network;
  readonly genesisHash: string;
  readonly sourceId: string;
  readonly signedTxJsonSha256: string;
  readonly bindingSha256: string;
  readonly eventContextJson: string;
  readonly blockHash: string;
  readonly blockHeight: number;
  readonly confirmations: number;
  readonly requiredConfirmations: number;
  readonly observedAtMs: number;
  readonly maximumAgeMs: number;
}

export interface ZcashConfirmedPayment {
  readonly payments: PaymentOrder;
  readonly receipt: Readonly<ZcashSettlementReceipt>;
  readonly receiptJson: string;
  assertPolicyCurrent(): void;
  assertCurrent(): Promise<void>;
}

const receiptFields = [
  'schema',
  'txId',
  'eventId',
  'attemptId',
  'network',
  'genesisHash',
  'sourceId',
  'signedTxJsonSha256',
  'bindingSha256',
  'eventContextJson',
  'blockHash',
  'blockHeight',
  'confirmations',
  'requiredConfirmations',
  'observedAtMs',
  'maximumAgeMs',
] as const;

const policyFields = [
  'network',
  'genesisHash',
  'sourceId',
  'requiredConfirmations',
  'maximumAgeMs',
] as const;

const snapshotFields = [
  'txId',
  'eventId',
  'attemptId',
  'signedTxJson',
  'binding',
] as const;
const storedSnapshotFields = [
  ...snapshotFields,
  'status',
  'settlementJson',
] as const;

const issuedConfirmedPayments = new WeakSet<object>();

const fail = (reason: string): never => {
  throw Error(`Invalid Zcash confirmation: ${reason}`);
};

const exact = <T extends readonly string[]>(
  value: unknown,
  fields: T,
  reason: string,
): RecordValue => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Reflect.ownKeys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field))
  )
    fail(reason);
  return value as RecordValue;
};

const hex32 = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

const uint32 = (value: unknown): value is number =>
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  Number(value) >= 0 &&
  Number(value) <= UINT32_MAX;

const positiveUint32 = (value: unknown): value is number =>
  uint32(value) && value >= 1;

const sourceId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);

const captureSnapshot = (value: unknown): RecordValue => {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    fail('snapshot');
  const object = value as object;
  const keys = Reflect.ownKeys(object);
  if (
    snapshotFields.some((field) => !Object.hasOwn(object, field)) ||
    keys.some(
      (key) =>
        typeof key !== 'string' ||
        !(storedSnapshotFields as readonly string[]).includes(key),
    )
  )
    fail('snapshot');
  const hasStatus = Object.hasOwn(object, 'status');
  const hasSettlement = Object.hasOwn(object, 'settlementJson');
  if (hasStatus !== hasSettlement) fail('snapshot');
  if (hasStatus) {
    const stored = object as RecordValue;
    if (
      !['signed', 'sent', 'completed'].includes(stored.status as string) ||
      (stored.settlementJson !== null &&
        typeof stored.settlementJson !== 'string')
    )
      fail('snapshot');
  }
  return object as RecordValue;
};

const canonicalContext = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_CONTEXT_JSON
  )
    fail('event context');
  const encoded = value as string;
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    fail('event context');
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    JSON.stringify(parsed) !== encoded
  )
    fail('event context');
  return encoded;
};

const capturePolicy = (value: unknown): Readonly<ZcashConfirmationPolicy> => {
  const input = exact(value, policyFields, 'policy shape');
  const policy: ZcashConfirmationPolicy = {
    network: input.network as Network,
    genesisHash: input.genesisHash as string,
    sourceId: input.sourceId as string,
    requiredConfirmations: input.requiredConfirmations as number,
    maximumAgeMs: input.maximumAgeMs as number,
  };
  if (
    !['mainnet', 'testnet', 'regtest'].includes(policy.network) ||
    !hex32(policy.genesisHash) ||
    !sourceId(policy.sourceId) ||
    !positiveUint32(policy.requiredConfirmations) ||
    !Number.isSafeInteger(policy.maximumAgeMs) ||
    policy.maximumAgeMs < 1 ||
    policy.maximumAgeMs > MAX_AGE_MS
  )
    fail('policy fields');
  return Object.freeze(policy);
};

const policyJson = (policy: ZcashConfirmationPolicy): string =>
  JSON.stringify({
    network: policy.network,
    genesisHash: policy.genesisHash,
    sourceId: policy.sourceId,
    requiredConfirmations: policy.requiredConfirmations,
    maximumAgeMs: policy.maximumAgeMs,
  });

const capturePayments = (value: PaymentOrder): PaymentOrder => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1_000)
    fail('payments');
  const payments = value.map((entry) => {
    const payment = exact(entry, ['address', 'assets'] as const, 'payment');
    const assets = exact(
      payment.assets,
      ['nativeToken', 'tokens'] as const,
      'payment assets',
    );
    if (
      typeof payment.address !== 'string' ||
      payment.address.length === 0 ||
      payment.address.length > 256 ||
      typeof assets.nativeToken !== 'bigint' ||
      assets.nativeToken < 1n ||
      assets.nativeToken > MAX_ZATOSHIS ||
      !Array.isArray(assets.tokens) ||
      assets.tokens.length !== 0
    )
      fail('payment fields');
    return Object.freeze({
      address: payment.address,
      assets: Object.freeze({
        nativeToken: assets.nativeToken,
        tokens: Object.freeze([]),
      }),
    });
  });
  return Object.freeze(payments) as unknown as PaymentOrder;
};

const signedHex = (
  signedJson: string,
  identity: Pick<ZcashSigningBinding, 'txId' | 'eventId'>,
): string => {
  assertZcashPaymentIdentity(signedJson, identity);
  const outer = JSON.parse(signedJson) as RecordValue;
  let payloadJson: string;
  let payload: RecordValue;
  try {
    payloadJson = new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.from(outer.txBytes as string, 'hex'),
    );
    const parsed = JSON.parse(payloadJson) as RecordValue;
    payload = parsed.schema === 2
      ? exact(parsed, ['schema', 'intent', 'pcztHex', 'fingerprintSha256',
          'sighashAll', 'txidRaw', 'authorization'] as const, 'signed transaction payload')
      : exact(parsed, ['schema', 'intent', 'unsignedTxHex', 'authorization'] as const,
          'signed transaction payload');
  } catch {
    return fail('signed transaction payload');
  }
  if (JSON.stringify(payload) !== payloadJson || (payload.schema !== 1 && payload.schema !== 2))
    fail('signed transaction payload');
  const authorization = exact(
    payload.authorization,
    ['compactSignatureHex', 'compressedPubkeyHex', 'signedTxHex'] as const,
    'signed authorization',
  );
  const raw = authorization.signedTxHex;
  if (
    typeof raw !== 'string' ||
    raw.length === 0 ||
    raw.length > MAX_MODEL_JSON ||
    raw.length % 2 !== 0 ||
    !/^[0-9a-f]+$/.test(raw)
  )
    fail('signed transaction bytes');
  return raw as string;
};

const captureObservation = (
  value: ZcashTransactionObservation,
): ZcashTransactionObservation => {
  if (value?.kind === 'absent') {
    exact(value, ['kind'] as const, 'observation');
    return Object.freeze({ kind: 'absent' });
  }
  if (value?.kind === 'mempool') {
    const input = exact(value, ['kind', 'txId', 'hex'] as const, 'observation');
    const txId = input.txId;
    const hex = input.hex;
    if (!hex32(txId) || typeof hex !== 'string') fail('observation fields');
    return Object.freeze({
      kind: 'mempool',
      txId: txId as string,
      hex: hex as string,
    });
  }
  if (value?.kind === 'confirmed') {
    const input = exact(
      value,
      ['kind', 'txId', 'hex', 'blockHash', 'height', 'confirmations'] as const,
      'observation',
    );
    const txId = input.txId;
    const hex = input.hex;
    const blockHash = input.blockHash;
    const height = input.height;
    const confirmations = input.confirmations;
    if (
      !hex32(txId) ||
      typeof hex !== 'string' ||
      !hex32(blockHash) ||
      !uint32(height) ||
      !positiveUint32(confirmations)
    )
      fail('observation fields');
    return Object.freeze({
      kind: 'confirmed',
      txId: txId as string,
      hex: hex as string,
      blockHash: blockHash as string,
      height: height as number,
      confirmations: confirmations as number,
    });
  }
  return fail('observation');
};

const assertObservationIdentity = (
  observation: Exclude<ZcashTransactionObservation, { kind: 'absent' }>,
  txId: string,
  expectedHex: string,
): void => {
  if (observation.txId !== txId || observation.hex !== expectedHex)
    fail('observation identity');
};

export const encodeZcashSettlementReceipt = (
  value: ZcashSettlementReceipt,
): string => {
  const input = exact(value, receiptFields, 'receipt shape');
  const receipt: ZcashSettlementReceipt = {
    schema: input.schema as 1,
    txId: input.txId as string,
    eventId: input.eventId as string,
    attemptId: input.attemptId as string,
    network: input.network as Network,
    genesisHash: input.genesisHash as string,
    sourceId: input.sourceId as string,
    signedTxJsonSha256: input.signedTxJsonSha256 as string,
    bindingSha256: input.bindingSha256 as string,
    eventContextJson: input.eventContextJson as string,
    blockHash: input.blockHash as string,
    blockHeight: input.blockHeight as number,
    confirmations: input.confirmations as number,
    requiredConfirmations: input.requiredConfirmations as number,
    observedAtMs: input.observedAtMs as number,
    maximumAgeMs: input.maximumAgeMs as number,
  };
  if (
    receipt.schema !== 1 ||
    !hex32(receipt.txId) ||
    !hex32(receipt.eventId) ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(receipt.attemptId) ||
    !['mainnet', 'testnet', 'regtest'].includes(receipt.network) ||
    !hex32(receipt.genesisHash) ||
    !sourceId(receipt.sourceId) ||
    !hex32(receipt.signedTxJsonSha256) ||
    !hex32(receipt.bindingSha256) ||
    !hex32(receipt.blockHash) ||
    !uint32(receipt.blockHeight) ||
    !positiveUint32(receipt.confirmations) ||
    !positiveUint32(receipt.requiredConfirmations) ||
    receipt.confirmations < receipt.requiredConfirmations ||
    !Number.isSafeInteger(receipt.observedAtMs) ||
    Object.is(receipt.observedAtMs, -0) ||
    receipt.observedAtMs < 0 ||
    !Number.isSafeInteger(receipt.maximumAgeMs) ||
    receipt.maximumAgeMs < 1 ||
    receipt.maximumAgeMs > MAX_AGE_MS
  )
    fail('receipt fields');
  canonicalContext(receipt.eventContextJson);
  return JSON.stringify(receipt);
};

export const decodeZcashSettlementReceipt = (
  encoded: string,
): Readonly<ZcashSettlementReceipt> => {
  if (
    typeof encoded !== 'string' ||
    encoded.length === 0 ||
    encoded.length > MAX_RECEIPT_JSON
  )
    fail('receipt encoding');
  let value: ZcashSettlementReceipt;
  try {
    value = JSON.parse(encoded) as ZcashSettlementReceipt;
  } catch {
    return fail('receipt encoding');
  }
  if (encodeZcashSettlementReceipt(value) !== encoded)
    fail('noncanonical receipt');
  return Object.freeze(value);
};

export function assertZcashConfirmedPayment(
  value: unknown,
): asserts value is ZcashConfirmedPayment {
  if (
    value === null ||
    typeof value !== 'object' ||
    !issuedConfirmedPayments.has(value)
  )
    fail('unissued payment');
}

interface ConfirmationSnapshot {
  readonly txId: string;
  readonly eventId: string;
  readonly attemptId: string;
  readonly signedTxJson: string;
  readonly binding: ZcashSigningBinding;
}

export class ZcashConfirmationAuthority {
  readonly #validate: ZcashConfirmationSource['validate'];
  readonly #observe: ZcashConfirmationSource['observe'];
  readonly #readPolicy: ZcashConfirmationSource['policy'];
  readonly #clock: () => number;
  readonly #policy: Readonly<ZcashConfirmationPolicy>;
  readonly #policyJson: string;

  constructor(source: ZcashConfirmationSource, now: () => number = Date.now) {
    if (
      source === null ||
      typeof source !== 'object' ||
      typeof source.validate !== 'function' ||
      typeof source.observe !== 'function' ||
      typeof source.policy !== 'function' ||
      typeof now !== 'function'
    )
      fail('source');
    this.#validate = source.validate.bind(source);
    this.#observe = source.observe.bind(source);
    this.#readPolicy = source.policy.bind(source);
    this.#clock = now.bind(undefined);
    this.#policy = capturePolicy(this.#readPolicy());
    this.#policyJson = policyJson(this.#policy);
  }

  #time(): number {
    const value = this.#clock();
    if (!Number.isSafeInteger(value) || Object.is(value, -0) || value < 0)
      fail('clock');
    return value;
  }

  #assertPolicy(): void {
    if (policyJson(capturePolicy(this.#readPolicy())) !== this.#policyJson)
      fail('policy changed');
  }

  async capture(
    value: ConfirmationSnapshot,
    eventContextJson: string,
  ): Promise<ZcashConfirmedPayment | null> {
    const input = captureSnapshot(value);
    const snapshot: ConfirmationSnapshot = {
      txId: input.txId as string,
      eventId: input.eventId as string,
      attemptId: input.attemptId as string,
      signedTxJson: input.signedTxJson as string,
      binding: input.binding as ZcashSigningBinding,
    };
    if (
      !hex32(snapshot.txId) ||
      !hex32(snapshot.eventId) ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(snapshot.attemptId) ||
      typeof snapshot.signedTxJson !== 'string' ||
      snapshot.signedTxJson.length === 0 ||
      snapshot.signedTxJson.length > MAX_MODEL_JSON
    )
      fail('snapshot fields');
    const context = canonicalContext(eventContextJson);
    const bindingJson = encodeZcashSigningBinding(snapshot.binding);
    const binding = decodeZcashSigningBinding(bindingJson);
    if (
      binding.txId !== snapshot.txId ||
      binding.eventId !== snapshot.eventId ||
      binding.genesisHash !== this.#policy.genesisHash
    )
      fail('snapshot binding');
    this.#assertPolicy();
    const payments = capturePayments(
      this.#validate(binding, snapshot.signedTxJson),
    );
    const expectedHex = signedHex(snapshot.signedTxJson, binding);
    this.#assertPolicy();
    const observation = captureObservation(
      await this.#observe(snapshot.signedTxJson),
    );
    this.#assertPolicy();
    if (observation.kind === 'absent') return null;
    assertObservationIdentity(observation, snapshot.txId, expectedHex);
    if (
      observation.kind === 'mempool' ||
      observation.confirmations < this.#policy.requiredConfirmations
    )
      return null;
    const observedAtMs = this.#time();
    const receiptJson = encodeZcashSettlementReceipt({
      schema: 1,
      txId: snapshot.txId,
      eventId: snapshot.eventId,
      attemptId: snapshot.attemptId,
      network: this.#policy.network,
      genesisHash: this.#policy.genesisHash,
      sourceId: this.#policy.sourceId,
      signedTxJsonSha256: createHash('sha256')
        .update(snapshot.signedTxJson)
        .digest('hex'),
      bindingSha256: createHash('sha256').update(bindingJson).digest('hex'),
      eventContextJson: context,
      blockHash: observation.blockHash,
      blockHeight: observation.height,
      confirmations: observation.confirmations,
      requiredConfirmations: this.#policy.requiredConfirmations,
      observedAtMs,
      maximumAgeMs: this.#policy.maximumAgeMs,
    });
    const receipt = decodeZcashSettlementReceipt(receiptJson);
    const assertPolicyCurrent = () => {
      this.#assertPolicy();
      const age = this.#time() - receipt.observedAtMs;
      if (age < 0 || age > receipt.maximumAgeMs) fail('confirmation expired');
    };
    const assertCurrent = async () => {
      assertPolicyCurrent();
      const current = captureObservation(
        await this.#observe(snapshot.signedTxJson),
      );
      assertPolicyCurrent();
      if (current.kind !== 'confirmed') fail('confirmation is not current');
      const confirmed = current as Extract<
        ZcashTransactionObservation,
        { kind: 'confirmed' }
      >;
      assertObservationIdentity(confirmed, receipt.txId, expectedHex);
      if (
        confirmed.blockHash !== receipt.blockHash ||
        confirmed.height !== receipt.blockHeight ||
        confirmed.confirmations < receipt.requiredConfirmations
      )
        fail('confirmation is not current');
    };
    const confirmed: ZcashConfirmedPayment = Object.freeze({
      payments,
      receipt,
      receiptJson,
      assertPolicyCurrent,
      assertCurrent,
    });
    issuedConfirmedPayments.add(confirmed);
    return confirmed;
  }
}
