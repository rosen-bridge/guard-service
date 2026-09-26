import { createHash } from 'node:crypto';
import { PaymentTransaction, TransactionType, type PaymentOrder } from '@rosen-chains/abstract-chain';
import { createZcashAddressCodec, type ZcashNetwork } from '@rosen-bridge/address-codec-zcash';
import type { NativeInspectionProvider } from '@rosen-bridge/rosen-extractor';
import {
  exactRecord, fail, hex, uint, MAX_PAYMENT_OUTPUTS, MAX_ZATOSHIS,
  type ConstructRequest, type DigestRequest, type DigestResponse, type NativePaymentProvider,
  type OrchardIntent, type OrchardVerifyResponse,
} from './nativePayment.js';

const MAX_MODEL_JSON = 1_000_000;
/** Transaction intent; imported proposal fields remain untrusted until separately authorized.
 * A native digest does not authenticate the prevout's source. */
export interface ZcashPaymentIntent {
  network: ZcashNetwork; eventId: string; txType: TransactionType; reserveAddress: string;
  branchId: string; lockTime: number; expiryHeight: number; sequence: number;
  input: { txid: string; index: number; amountZat: bigint; scriptPubKeyHex: string };
  payments: PaymentOrder; feeZat: bigint;
  orchard?: { nativeNetwork: OrchardIntent['network']; targetHeight: number; compressedPubkeyHex: string };
}
interface EncodedIntent extends Omit<ZcashPaymentIntent, 'input' | 'payments' | 'feeZat'> {
  input: { txid: string; index: number; amountZat: string; scriptPubKeyHex: string };
  payments: Array<{address: string; amountZat: string}>; feeZat: string;
}
interface Authorization { compactSignatureHex: string; compressedPubkeyHex: string; signedTxHex: string; }
function zatoshis(value: unknown, positive = false): bigint {
  if (typeof value !== 'bigint' || value < (positive ? 1n : 0n) || value > BigInt(MAX_ZATOSHIS)) fail('amount');
  return value;
}
function encodeIntent(intent: ZcashPaymentIntent): EncodedIntent {
  const orchard = Object.hasOwn(intent, 'orchard');
  exactRecord(intent, ['network', 'eventId', 'txType', 'reserveAddress', 'branchId', 'lockTime',
    'expiryHeight', 'sequence', 'input', 'payments', 'feeZat', ...(orchard ? ['orchard'] : [])]);
  const codec = createZcashAddressCodec(intent.network);
  const reserve = codec.parseAddress(intent.reserveAddress);
  hex(intent.eventId, 64); hex(intent.branchId, 8);
  if (!Object.values(TransactionType).includes(intent.txType)) fail('transaction_type');
  exactRecord(intent.input, ['txid', 'index', 'amountZat', 'scriptPubKeyHex']);
  if (intent.input.scriptPubKeyHex !== reserve.scriptPubKeyHex) fail('reserve_input');
  if (!Array.isArray(intent.payments) || intent.payments.length < 1 || intent.payments.length > MAX_PAYMENT_OUTPUTS) fail('payments');
  const payments = Array.from(intent.payments, payment => {
    exactRecord(payment, Object.hasOwn(payment, 'extra') ? ['address', 'assets', 'extra'] : ['address', 'assets']);
    if (payment.extra !== undefined) fail('unsupported_recipient');
    exactRecord(payment.assets, ['nativeToken', 'tokens']);
    if (!Array.isArray(payment.assets.tokens) || payment.assets.tokens.length !== 0) fail('unsupported_asset');
    const recipient = codec.parseRecipient(payment.address);
    if (recipient.kind === 'transparent-p2pkh' && recipient.scriptPubKeyHex === reserve.scriptPubKeyHex) fail('self_payment');
    if (orchard !== (recipient.kind === 'orchard')) fail('recipient_kind');
    return {address: payment.address, amountZat: zatoshis(payment.assets.nativeToken, true).toString()};
  });
  let orchardFields: EncodedIntent['orchard'];
  if (orchard) {
    const fields = exactRecord(intent.orchard, ['nativeNetwork', 'targetHeight', 'compressedPubkeyHex']);
    if ((intent.network === 'regtest' && fields.nativeNetwork !== 'regtest_nu6_2_at_two') ||
        (intent.network === 'testnet' && fields.nativeNetwork !== 'testnet_nu6_2') ||
        intent.network === 'mainnet' || intent.branchId !== '5437f330' || intent.lockTime !== 0 ||
        intent.sequence !== 0xffff_ffff || payments.length !== 1 || intent.feeZat !== 15_000n) fail('orchard_policy');
    orchardFields = {nativeNetwork: fields.nativeNetwork as OrchardIntent['network'],
      targetHeight: uint(fields.targetHeight), compressedPubkeyHex: hex(fields.compressedPubkeyHex, 66)};
    publicKeyMatches(orchardFields.compressedPubkeyHex, reserve.scriptPubKeyHex);
    const lower = intent.network === 'regtest' ? 2 : 4_052_000;
    if (orchardFields.targetHeight < lower ||
        (intent.network === 'testnet' && orchardFields.targetHeight >= 4_134_000) ||
        intent.expiryHeight < orchardFields.targetHeight ||
        (intent.network === 'testnet' && intent.expiryHeight >= 4_134_000) ||
        intent.expiryHeight > orchardFields.targetHeight + 40) fail('orchard_height');
    const change = intent.input.amountZat - BigInt(payments[0].amountZat) - intent.feeZat;
    if (change <= 0n) fail('orchard_change');
  }
  return {
    network: intent.network, eventId: intent.eventId, txType: intent.txType, reserveAddress: reserve.address,
    branchId: intent.branchId, lockTime: uint(intent.lockTime), expiryHeight: uint(intent.expiryHeight), sequence: uint(intent.sequence),
    input: {txid: hex(intent.input.txid, 64), index: uint(intent.input.index),
      amountZat: zatoshis(intent.input.amountZat, true).toString(), scriptPubKeyHex: reserve.scriptPubKeyHex},
    payments, feeZat: zatoshis(intent.feeZat).toString(), ...(orchardFields ? {orchard: orchardFields} : {}),
  };
}
function decodeIntent(intent: EncodedIntent): ZcashPaymentIntent {
  return {...intent, input: {...intent.input, amountZat: BigInt(intent.input.amountZat)},
    payments: intent.payments.map(payment => ({address: payment.address, assets: {nativeToken: BigInt(payment.amountZat), tokens: []}})),
    feeZat: BigInt(intent.feeZat)};
}
function decodeModelPayload(json: string): Record<string, unknown> {
  if (typeof json !== 'string' || json.length > MAX_MODEL_JSON) fail('model_size');
  try {
    const outer = exactRecord(JSON.parse(json), ['network', 'eventId', 'txBytes', 'txId', 'txType']);
    if (typeof outer.txBytes !== 'string' || outer.txBytes.length % 2) fail('model_encoding');
    hex(outer.txBytes, outer.txBytes.length);
    return decodePayloadBytes(outer.txBytes);
  } catch { fail('model_encoding'); }
}
function decodePayloadBytes(bytes: string): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.from(bytes, 'hex')));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('model_encoding');
  const schema = (value as Record<string, unknown>).schema;
  return exactRecord(value, schema === 2 ?
    ['schema', 'intent', 'pcztHex', 'fingerprintSha256', 'sighashAll', 'txidRaw', 'authorization'] :
    ['schema', 'intent', 'unsignedTxHex', 'authorization']);
}
function decodeProposedIntent(value: unknown): ZcashPaymentIntent {
  const hasOrchard = typeof value === 'object' && value !== null && Object.hasOwn(value, 'orchard');
  const proposed = exactRecord(value, ['network', 'eventId', 'txType', 'reserveAddress', 'branchId',
    'lockTime', 'expiryHeight', 'sequence', 'input', 'payments', 'feeZat', ...(hasOrchard ? ['orchard'] : [])]);
  const input = exactRecord(proposed.input, ['txid', 'index', 'amountZat', 'scriptPubKeyHex']);
  const decimal = (amount: unknown): void => {
    if (typeof amount !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(amount)) fail('model_amount');
    zatoshis(BigInt(amount));
  };
  decimal(input.amountZat); decimal(proposed.feeZat);
  if (!Array.isArray(proposed.payments) || proposed.payments.length < 1 ||
    proposed.payments.length > MAX_PAYMENT_OUTPUTS) fail('payments');
  for (const payment of proposed.payments) {
    const row = exactRecord(payment, ['address', 'amountZat']);
    decimal(row.amountZat);
  }
  if (hasOrchard) exactRecord(proposed.orchard, ['nativeNetwork', 'targetHeight', 'compressedPubkeyHex']);
  return decodeIntent(proposed as unknown as EncodedIntent);
}

function orchardRequest(intent: EncodedIntent): OrchardIntent {
  if (!intent.orchard) fail('orchard_policy');
  const payout = intent.payments[0];
  const change = BigInt(intent.input.amountZat) - BigInt(payout.amountZat) - BigInt(intent.feeZat);
  if (change <= 0n) fail('orchard_change');
  return {network: intent.orchard.nativeNetwork, expected_branch_id: intent.branchId, target_height: intent.orchard.targetHeight,
    expiry_height: intent.expiryHeight, input: {
      prevout_txid: intent.input.txid, prevout_index: intent.input.index, sequence: intent.sequence,
      amount_zat: Number(intent.input.amountZat), script_pubkey_hex: intent.input.scriptPubKeyHex,
    }, compressed_pubkey_hex: intent.orchard.compressedPubkeyHex,
    recipient_ua: payout.address, payout_zat: Number(payout.amountZat), change_zat: Number(change)};
}
function orchardDigest(response: OrchardVerifyResponse): DigestResponse {
  return {operation: 'digest', txid_raw: response.txid_raw, sighash_all: response.sighash_all,
    actual_fee_zat: response.actual_fee_zat, zip317_conventional_fee_zat: 15_000};
}
function construction(intent: EncodedIntent): ConstructRequest {
  const codec = createZcashAddressCodec(intent.network);
  const total = intent.payments.reduce((sum, payment) => sum + BigInt(payment.amountZat), 0n);
  const change = BigInt(intent.input.amountZat) - total - BigInt(intent.feeZat);
  if (change < 0n) fail('insufficient_input');
  const outputs = intent.payments.map(payment => ({value_zat: Number(payment.amountZat),
    script_pubkey_hex: codec.parseAddress(payment.address).scriptPubKeyHex}));
  if (change > 0n) outputs.push({value_zat: Number(change), script_pubkey_hex: intent.input.scriptPubKeyHex});
  if (outputs.length > MAX_PAYMENT_OUTPUTS) fail('outputs');
  return {expected_branch_id: intent.branchId, lock_time: intent.lockTime, expiry_height: intent.expiryHeight,
    input: {prevout_txid: intent.input.txid, prevout_index: intent.input.index, sequence: intent.sequence,
      amount_zat: Number(intent.input.amountZat), script_pubkey_hex: intent.input.scriptPubKeyHex}, outputs};
}
function displayId(rawId: string): string { return Buffer.from(hex(rawId, 64), 'hex').reverse().toString('hex'); }
function digestRequest(intent: EncodedIntent, unsigned: string): DigestRequest {
  return {unsigned_tx_hex: unsigned, expected_branch_id: intent.branchId,
    input_amount_zat: Number(intent.input.amountZat), prevout_script_hex: intent.input.scriptPubKeyHex};
}
function inspectFields(raw: string, request: ConstructRequest, expectedId: string,
  inspector: NativeInspectionProvider, expectedScriptSig = ''): void {
  const value = inspector.inspect(raw, request.expected_branch_id);
  if (value.version.kind !== 'v5' || value.version.number !== 5 || value.branch_source !== 'embedded' ||
      value.consensus_branch_id !== request.expected_branch_id || value.txid !== expectedId ||
      value.coinbase || !value.fully_transparent || value.shielded.present || !value.transparent.present ||
      value.lock_time !== request.lock_time || value.expiry_height !== request.expiry_height ||
      value.transparent.inputs.length !== 1 || value.transparent.outputs.length !== request.outputs.length) fail('inspection');
  const input = value.transparent.inputs[0];
  if (input.prevout_txid !== request.input.prevout_txid || input.prevout_index !== request.input.prevout_index ||
      input.sequence !== request.input.sequence || input.script_sig_hex !== expectedScriptSig) fail('input_join');
  value.transparent.outputs.forEach((output, index) => {
    if (output.index !== index || output.value_zat !== request.outputs[index].value_zat ||
        output.script_pubkey_hex !== request.outputs[index].script_pubkey_hex || output.script_kind !== 'pubkeyhash') fail('output_join');
  });
}
function inspectOrchardSigned(raw: string, intent: EncodedIntent, expectedId: string,
  changeZat: number, inspector: NativeInspectionProvider): void {
  const inspection = inspector.inspect(raw, intent.branchId);
  if (inspection.txid !== expectedId || inspection.consensus_branch_id !== intent.branchId ||
      inspection.version.kind !== 'v5' || inspection.version.number !== 5 ||
      inspection.branch_source !== 'embedded' || inspection.coinbase ||
      !inspection.shielded.present || inspection.fully_transparent ||
      !inspection.transparent.present || inspection.transparent.inputs.length !== 1 ||
      inspection.transparent.outputs.length !== 1 ||
      inspection.transparent.inputs[0].prevout_txid !== intent.input.txid ||
      inspection.transparent.inputs[0].prevout_index !== intent.input.index ||
      inspection.transparent.inputs[0].sequence !== intent.sequence ||
      inspection.transparent.outputs[0].index !== 0 ||
      inspection.transparent.outputs[0].value_zat !== changeZat ||
      inspection.transparent.outputs[0].script_pubkey_hex !== intent.input.scriptPubKeyHex ||
      inspection.transparent.outputs[0].script_kind !== 'pubkeyhash' ||
      inspection.expiry_height !== intent.expiryHeight || inspection.lock_time !== 0) fail('orchard_inspection');
}
export function publicKeyMatches(pubkey: string, script: string): void {
  hex(pubkey, 66);
  if (!/^(02|03)/.test(pubkey)) fail('public_key');
  const digest = createHash('ripemd160').update(createHash('sha256').update(Buffer.from(pubkey, 'hex')).digest()).digest('hex');
  if ('76a914' + digest + '88ac' !== script) fail('public_key');
}
function derPlusType(compact: string): string {
  const bytes = Buffer.from(hex(compact, 128), 'hex');
  const integer = (part: Buffer): Buffer => {
    let start = 0; while (start < part.length - 1 && part[start] === 0) start++;
    let result = part.subarray(start);
    if (result[0] & 0x80) result = Buffer.concat([Buffer.from([0]), result]);
    return Buffer.concat([Buffer.from([2, result.length]), result]);
  };
  const body = Buffer.concat([integer(bytes.subarray(0, 32)), integer(bytes.subarray(32))]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body, Buffer.from([1])]).toString('hex');
}

/** Immutable Rosen container. Proposal consistency does not confer signing approval. */
export class ZcashTransaction extends PaymentTransaction {
  readonly #intentJson: string;
  readonly #unsigned: string;
  readonly #digestJson: string;
  readonly #authorizationJson: string;
  readonly #orchardFingerprint: string | undefined;

  private constructor(intent: EncodedIntent, unsigned: string, digest: DigestResponse, authorization: Authorization | null,
    orchardFingerprint?: string) {
    const payload = orchardFingerprint === undefined ? JSON.stringify({schema: 1, intent, unsignedTxHex: unsigned, authorization}) :
      JSON.stringify({schema: 2, intent, pcztHex: unsigned, fingerprintSha256: orchardFingerprint,
        sighashAll: digest.sighash_all, txidRaw: digest.txid_raw, authorization});
    if (payload.length * 2 + 300 > MAX_MODEL_JSON) fail('model_size');
    const bytes = Buffer.from(payload, 'utf8');
    super('zcash', displayId(digest.txid_raw), intent.eventId, bytes, intent.txType);
    this.#intentJson = JSON.stringify(intent); this.#unsigned = unsigned;
    this.#digestJson = JSON.stringify(digest); this.#authorizationJson = JSON.stringify(authorization);
    this.#orchardFingerprint = orchardFingerprint;
    Object.defineProperty(this, 'txBytes', {enumerable: true, configurable: false, get: () => Uint8Array.from(bytes)});
    Object.freeze(this);
  }

  static create(intent: ZcashPaymentIntent, native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    const snapshot = encodeIntent(intent);
    if (snapshot.orchard) {
      if (!native.orchardPrepare || !native.orchardVerify) fail('orchard_native');
      const request = orchardRequest(snapshot);
      const prepared = native.orchardPrepare({intent: structuredClone(request)});
      const verified = native.orchardVerify({intent: structuredClone(request), pczt_hex: prepared.pczt_hex});
      if (prepared.operation !== 'orchard_prepare' || verified.operation !== 'orchard_verify' ||
          prepared.fingerprint_sha256 !== verified.fingerprint_sha256 || prepared.txid_raw !== verified.txid_raw ||
          prepared.sighash_all !== verified.sighash_all || prepared.actual_fee_zat !== verified.actual_fee_zat ||
          verified.actual_fee_zat !== Number(snapshot.feeZat) || !prepared.recipient_ciphertext_verified ||
          !prepared.orchard_proof_verified || !verified.recipient_ciphertext_verified || !verified.orchard_proof_verified) fail('orchard_prepare_join');
      hex(prepared.pczt_hex, prepared.pczt_hex.length); hex(verified.fingerprint_sha256, 64);
      hex(verified.txid_raw, 64); hex(verified.sighash_all, 64);
      return new ZcashTransaction(snapshot, prepared.pczt_hex, orchardDigest(verified), null,
        verified.fingerprint_sha256);
    }
    const request = construction(snapshot);
    const made = native.construct(structuredClone(request));
    const digest = native.digest(digestRequest(snapshot, made.unsigned_tx_hex));
    if (made.operation !== 'construct' || digest.operation !== 'digest' || made.txid_raw !== digest.txid_raw ||
        made.sighash_all !== digest.sighash_all || made.actual_fee_zat !== Number(snapshot.feeZat) ||
        digest.actual_fee_zat !== made.actual_fee_zat || digest.zip317_conventional_fee_zat !== made.zip317_conventional_fee_zat) fail('construction_join');
    hex(digest.sighash_all, 64); uint(digest.actual_fee_zat, MAX_ZATOSHIS); uint(digest.zip317_conventional_fee_zat, MAX_ZATOSHIS);
    inspectFields(made.unsigned_tx_hex, request, displayId(digest.txid_raw), inspector);
    // These positions are used only after native v5/single-input/canonical parsing.
    if (!made.unsigned_tx_hex.startsWith('050000800a27a726') || made.unsigned_tx_hex.slice(40, 42) !== '01' ||
        made.unsigned_tx_hex.slice(114, 116) !== '00') fail('single_input_encoding');
    return new ZcashTransaction(snapshot, made.unsigned_tx_hex, digest, null);
  }

  static fromJson(json: string, expectedIntent: ZcashPaymentIntent,
    native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    return ZcashTransaction.restoreCompared(json, decodeModelPayload(json), expectedIntent, native, inspector);
  }

  /** Inspects an untrusted proposal's canonical native consistency only; it grants no approval. */
  static inspectProposalJson(json: string, native: NativePaymentProvider,
    inspector: NativeInspectionProvider): ZcashTransaction {
    const payload = decodeModelPayload(json);
    const proposedIntent = decodeProposedIntent(payload.intent);
    return ZcashTransaction.restoreCompared(json, payload, proposedIntent, native, inspector);
  }

  /** Inspects Rosen's serialized txBytes payload; this is not raw Zcash hex or signing approval. */
  static inspectProposalBytes(serialized: string, native: NativePaymentProvider,
    inspector: NativeInspectionProvider): ZcashTransaction {
    if (typeof serialized !== 'string' || serialized.length > MAX_MODEL_JSON) fail('model_size');
    let payload: Record<string, unknown>;
    try {
      if (serialized.length === 0 || serialized.length % 2) fail('model_encoding');
      hex(serialized, serialized.length);
      payload = decodePayloadBytes(serialized);
    } catch { fail('model_encoding'); }
    const expected = ZcashTransaction.restorePayload(payload, decodeProposedIntent(payload.intent), native, inspector);
    if (Buffer.from(expected.txBytes).toString('hex') !== serialized) fail('intent_join');
    return expected;
  }

  private static restoreCompared(json: string, payload: Record<string, unknown>, intent: ZcashPaymentIntent,
    native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    const expected = ZcashTransaction.restorePayload(payload, intent, native, inspector);
    if (expected.toJson() !== json) fail('intent_join');
    return expected;
  }

  private static restorePayload(payload: Record<string, unknown>, intent: ZcashPaymentIntent,
    native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    const snapshot = encodeIntent(intent);
    let expected: ZcashTransaction;
    if (snapshot.orchard) {
      if (payload.schema !== 2 || !native.orchardVerify) fail('orchard_model');
      const pczt = hex(payload.pcztHex, typeof payload.pcztHex === 'string' ? payload.pcztHex.length : 0);
      const verified = native.orchardVerify({intent: orchardRequest(snapshot), pczt_hex: pczt});
      if (verified.operation !== 'orchard_verify' || verified.actual_fee_zat !== Number(snapshot.feeZat) ||
          verified.recipient_ciphertext_verified !== true || verified.orchard_proof_verified !== true ||
          verified.fingerprint_sha256 !== payload.fingerprintSha256 ||
          verified.sighash_all !== payload.sighashAll || verified.txid_raw !== payload.txidRaw) fail('orchard_verify_join');
      hex(verified.fingerprint_sha256, 64); hex(verified.sighash_all, 64); hex(verified.txid_raw, 64);
      expected = new ZcashTransaction(snapshot, pczt, orchardDigest(verified), null, verified.fingerprint_sha256);
    } else {
      if (payload.schema !== 1) fail('model_schema');
      expected = ZcashTransaction.create(intent, native, inspector);
    }
    if (payload.authorization !== null) {
      const authorization = exactRecord(payload.authorization, ['compactSignatureHex', 'compressedPubkeyHex', 'signedTxHex']);
      const signature = hex(authorization.compactSignatureHex, 128);
      const pubkey = hex(authorization.compressedPubkeyHex, 66);
      const signedHex = hex(authorization.signedTxHex,
        typeof authorization.signedTxHex === 'string' ? authorization.signedTxHex.length : 0);
      if (snapshot.orchard) {
        if (!native.orchardVerifySigned || !expected.#orchardFingerprint ||
            pubkey !== snapshot.orchard.compressedPubkeyHex) fail('orchard_native');
        publicKeyMatches(pubkey, snapshot.input.scriptPubKeyHex);
        const request = orchardRequest(snapshot);
        const checked = native.orchardVerifySigned({intent: request, pczt_hex: expected.#unsigned,
          fingerprint_sha256: expected.#orchardFingerprint, compact_signature_hex: signature,
          signed_tx_hex: signedHex});
        if (checked.operation !== 'orchard_verify_signed' ||
            checked.signed_txid_raw !== expected.getDigest().txid_raw ||
            checked.fingerprint_sha256 !== expected.#orchardFingerprint ||
            checked.sighash_all !== expected.getDigest().sighash_all ||
            checked.recipient_ciphertext_verified !== true || checked.orchard_proof_verified !== true) fail('orchard_signed_join');
        inspectOrchardSigned(signedHex, snapshot, expected.txId, request.change_zat, inspector);
        expected = new ZcashTransaction(snapshot, expected.#unsigned, expected.getDigest(),
          {compactSignatureHex: signature, compressedPubkeyHex: pubkey, signedTxHex: signedHex},
          expected.#orchardFingerprint);
      } else {
        expected = expected.finalize(signature, pubkey, native, inspector);
      }
    }
    return expected;
  }

  /** Rechecks against current, separately supplied authority before signing or consumption. */
  validate(expectedIntent: ZcashPaymentIntent, native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    return ZcashTransaction.fromJson(this.toJson(), expectedIntent, native, inspector);
  }
  getUnsignedHex(): string { return this.#unsigned; }
  getSignedHex(): string | undefined { return (JSON.parse(this.#authorizationJson) as Authorization | null)?.signedTxHex; }
  getDigest(): DigestResponse { return JSON.parse(this.#digestJson) as DigestResponse; }
  getIntent(): ZcashPaymentIntent { return decodeIntent(JSON.parse(this.#intentJson) as EncodedIntent); }
  extractPaymentOrder(): PaymentOrder { return this.getIntent().payments; }

  finalize(compactSignature: string, pubkey: string, native: NativePaymentProvider, inspector: NativeInspectionProvider): ZcashTransaction {
    const intent = JSON.parse(this.#intentJson) as EncodedIntent;
    publicKeyMatches(pubkey, intent.input.scriptPubKeyHex);
    if (intent.orchard) {
      if (!native.orchardVerify || !native.orchardFinalize || !this.#orchardFingerprint ||
          pubkey !== intent.orchard.compressedPubkeyHex) fail('orchard_native');
      const request = orchardRequest(intent);
      const verified = native.orchardVerify({intent: request, pczt_hex: this.#unsigned});
      const digest = this.getDigest();
      if (verified.operation !== 'orchard_verify' || verified.fingerprint_sha256 !== this.#orchardFingerprint ||
          verified.txid_raw !== digest.txid_raw || verified.sighash_all !== digest.sighash_all ||
          verified.actual_fee_zat !== digest.actual_fee_zat || verified.recipient_ciphertext_verified !== true ||
          verified.orchard_proof_verified !== true) fail('orchard_verify_join');
      const signed = native.orchardFinalize({intent: request, pczt_hex: this.#unsigned,
        fingerprint_sha256: this.#orchardFingerprint, compact_signature_hex: hex(compactSignature, 128)});
      if (signed.operation !== 'orchard_finalize' || signed.fingerprint_sha256 !== this.#orchardFingerprint ||
          signed.sighash_all !== digest.sighash_all || signed.signed_txid_raw !== digest.txid_raw ||
          signed.recipient_ciphertext_verified !== true || signed.orchard_proof_verified !== true) fail('orchard_finalization_join');
      inspectOrchardSigned(signed.signed_tx_hex, intent, this.txId, request.change_zat, inspector);
      return new ZcashTransaction(intent, this.#unsigned, digest, {
        compactSignatureHex: compactSignature, compressedPubkeyHex: pubkey, signedTxHex: signed.signed_tx_hex,
      }, this.#orchardFingerprint);
    }
    const signed = native.finalize({...digestRequest(intent, this.#unsigned),
      compact_signature_hex: hex(compactSignature, 128), compressed_pubkey_hex: hex(pubkey, 66)});
    const digest = this.getDigest();
    const der = derPlusType(compactSignature);
    const scriptSig = (der.length / 2).toString(16).padStart(2, '0') + der + '21' + pubkey;
    const scriptLength = scriptSig.length / 2;
    if (scriptLength >= 253) fail('authorization_size');
    const expectedSigned = this.#unsigned.slice(0, 114) + scriptLength.toString(16).padStart(2, '0') + scriptSig + this.#unsigned.slice(116);
    if (signed.operation !== 'finalize' || signed.unsigned_txid_raw !== digest.txid_raw || signed.signed_txid_raw !== digest.txid_raw ||
        signed.sighash_all !== digest.sighash_all || signed.actual_fee_zat !== digest.actual_fee_zat ||
        signed.zip317_conventional_fee_zat !== digest.zip317_conventional_fee_zat || signed.callback_count !== 1 ||
        signed.der_signature_plus_type_hex !== der || signed.script_sig_hex !== scriptSig || signed.signed_tx_hex !== expectedSigned) fail('finalization_join');
    inspectFields(signed.signed_tx_hex, construction(intent), this.txId, inspector, scriptSig);
    return new ZcashTransaction(intent, this.#unsigned, digest, {
      compactSignatureHex: compactSignature, compressedPubkeyHex: pubkey, signedTxHex: signed.signed_tx_hex,
    });
  }
}
