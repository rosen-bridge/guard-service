import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { isAbsolute } from 'node:path';

export const MAX_ZATOSHIS = 2_100_000_000_000_000;
export const MAX_PAYMENT_OUTPUTS = 1024;
const MAX_REQUEST_BYTES = 4_001_024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export class ZcashPaymentError extends Error {
  constructor(readonly code: string) { super('Zcash payment ' + code + ' failure'); this.name = 'ZcashPaymentError'; }
}
export function fail(code: string): never { throw new ZcashPaymentError(code); }
export function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('shape');
  const item = value as Record<string, unknown>;
  const actual = Object.keys(item);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) fail('shape');
  return item;
}
export function hex(value: unknown, length: number): string {
  if (typeof value !== 'string' || value.length !== length || !/^[0-9a-f]+$/.test(value)) fail('hex');
  return value;
}
export function uint(value: unknown, max = 0xffff_ffff): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max || Object.is(value, -0)) fail('integer');
  return value;
}
function raw(value: unknown): string {
  if (typeof value !== 'string' || value.length < 2 || value.length > 4_000_000 || value.length % 2) fail('raw');
  return hex(value, value.length);
}
function p2pkh(value: unknown): string {
  const script = hex(value, 50);
  if (!/^76a914[0-9a-f]{40}88ac$/.test(script)) fail('script');
  return script;
}
export interface ConstructRequest {
  expected_branch_id: string; lock_time: number; expiry_height: number;
  input: { prevout_txid: string; prevout_index: number; sequence: number; amount_zat: number; script_pubkey_hex: string };
  outputs: Array<{ value_zat: number; script_pubkey_hex: string }>;
}
export interface DigestRequest {
  unsigned_tx_hex: string; expected_branch_id: string; input_amount_zat: number; prevout_script_hex: string;
}
export interface FinalizeRequest extends DigestRequest { compact_signature_hex: string; compressed_pubkey_hex: string; }
export interface DigestResponse { operation: 'digest'; txid_raw: string; sighash_all: string; actual_fee_zat: number; zip317_conventional_fee_zat: number; }
export interface ConstructResponse extends Omit<DigestResponse, 'operation'> { operation: 'construct'; unsigned_tx_hex: string; }
export interface FinalizeResponse extends Omit<DigestResponse, 'operation' | 'txid_raw'> {
  operation: 'finalize'; unsigned_txid_raw: string; signed_txid_raw: string;
  der_signature_plus_type_hex: string; script_sig_hex: string; signed_tx_hex: string; callback_count: number;
}
export interface OrchardIntent {
  network: 'regtest_nu6_2_at_two' | 'testnet_nu6_2';
  expected_branch_id: string; target_height: number; expiry_height: number;
  input: ConstructRequest['input']; compressed_pubkey_hex: string;
  recipient_ua: string; payout_zat: number; change_zat: number;
}
export interface OrchardPrepareRequest { intent: OrchardIntent; }
export interface OrchardVerifyRequest extends OrchardPrepareRequest { pczt_hex: string; }
export interface OrchardFinalizeRequest extends OrchardVerifyRequest {
  fingerprint_sha256: string; compact_signature_hex: string;
}
export interface OrchardVerifySignedRequest extends OrchardFinalizeRequest { signed_tx_hex: string; }
export interface OrchardVerifyResponse {
  operation: 'orchard_verify'; txid_raw: string; fingerprint_sha256: string; sighash_all: string; actual_fee_zat: number;
  recipient_ciphertext_verified: true; orchard_proof_verified: true;
}
export interface OrchardPrepareResponse extends Omit<OrchardVerifyResponse, 'operation'> {
  operation: 'orchard_prepare'; pczt_hex: string;
}
export interface OrchardFinalizeResponse extends Omit<OrchardVerifyResponse, 'operation' | 'actual_fee_zat'> {
  operation: 'orchard_finalize'; signed_tx_hex: string; signed_txid_raw: string;
}
export interface OrchardVerifySignedResponse extends Omit<OrchardFinalizeResponse, 'operation' | 'signed_tx_hex'> {
  operation: 'orchard_verify_signed';
}
export interface NativePaymentProvider {
  construct(request: ConstructRequest): ConstructResponse;
  digest(request: DigestRequest): DigestResponse;
  finalize(request: FinalizeRequest): FinalizeResponse;
  orchardPrepare?(request: OrchardPrepareRequest): OrchardPrepareResponse;
  orchardVerify?(request: OrchardVerifyRequest): OrchardVerifyResponse;
  orchardFinalize?(request: OrchardFinalizeRequest): OrchardFinalizeResponse;
  orchardVerifySigned?(request: OrchardVerifySignedRequest): OrchardVerifySignedResponse;
}

function orchardIntent(value: unknown): OrchardIntent {
  const item = exactRecord(value, ['network', 'expected_branch_id', 'target_height', 'expiry_height', 'input',
    'compressed_pubkey_hex', 'recipient_ua', 'payout_zat', 'change_zat']);
  const input = exactRecord(item.input, ['prevout_txid', 'prevout_index', 'sequence', 'amount_zat', 'script_pubkey_hex']);
  const pubkey = hex(item.compressed_pubkey_hex, 66);
  if (!/^(02|03)/.test(pubkey)) fail('public_key');
  if (typeof item.recipient_ua !== 'string' || item.recipient_ua.length < 10 || item.recipient_ua.length > 4096 ||
      !/^[a-z0-9]+$/.test(item.recipient_ua)) fail('recipient');
  if (item.network !== 'regtest_nu6_2_at_two' && item.network !== 'testnet_nu6_2') fail('orchard_network');
  return {network: item.network, expected_branch_id: hex(item.expected_branch_id, 8), target_height: uint(item.target_height),
    expiry_height: uint(item.expiry_height), input: {
      prevout_txid: hex(input.prevout_txid, 64), prevout_index: uint(input.prevout_index),
      sequence: uint(input.sequence), amount_zat: uint(input.amount_zat, MAX_ZATOSHIS),
      script_pubkey_hex: p2pkh(input.script_pubkey_hex),
    }, compressed_pubkey_hex: pubkey, recipient_ua: item.recipient_ua,
    payout_zat: uint(item.payout_zat, MAX_ZATOSHIS), change_zat: uint(item.change_zat, MAX_ZATOSHIS)};
}

function normalizeRequest(operation: string, value: unknown): Record<string, unknown> {
  if (operation.startsWith('orchard_')) {
    const keys = operation === 'orchard_prepare' ? ['intent'] : operation === 'orchard_verify' ?
      ['intent', 'pczt_hex'] : operation === 'orchard_finalize' ?
      ['intent', 'pczt_hex', 'fingerprint_sha256', 'compact_signature_hex'] :
      ['intent', 'pczt_hex', 'fingerprint_sha256', 'compact_signature_hex', 'signed_tx_hex'];
    const item = exactRecord(value, keys);
    const request: Record<string, unknown> = {operation, intent: orchardIntent(item.intent)};
    if (operation !== 'orchard_prepare') request.pczt_hex = raw(item.pczt_hex);
    if (operation === 'orchard_finalize' || operation === 'orchard_verify_signed') {
      request.fingerprint_sha256 = hex(item.fingerprint_sha256, 64);
      request.compact_signature_hex = hex(item.compact_signature_hex, 128);
    }
    if (operation === 'orchard_verify_signed') request.signed_tx_hex = raw(item.signed_tx_hex);
    return request;
  }
  if (operation === 'construct') {
    const item = exactRecord(value, ['expected_branch_id', 'lock_time', 'expiry_height', 'input', 'outputs']);
    const input = exactRecord(item.input, ['prevout_txid', 'prevout_index', 'sequence', 'amount_zat', 'script_pubkey_hex']);
    if (!Array.isArray(item.outputs) || item.outputs.length < 1 || item.outputs.length > MAX_PAYMENT_OUTPUTS) fail('outputs');
    return {
      operation, expected_branch_id: hex(item.expected_branch_id, 8), lock_time: uint(item.lock_time), expiry_height: uint(item.expiry_height),
      input: { prevout_txid: hex(input.prevout_txid, 64), prevout_index: uint(input.prevout_index), sequence: uint(input.sequence),
        amount_zat: uint(input.amount_zat, MAX_ZATOSHIS), script_pubkey_hex: p2pkh(input.script_pubkey_hex) },
      outputs: Array.from(item.outputs, value => {
        const output = exactRecord(value, ['value_zat', 'script_pubkey_hex']);
        return { value_zat: uint(output.value_zat, MAX_ZATOSHIS), script_pubkey_hex: p2pkh(output.script_pubkey_hex) };
      }),
    };
  }
  const keys = ['unsigned_tx_hex', 'expected_branch_id', 'input_amount_zat', 'prevout_script_hex'];
  if (operation === 'finalize') keys.push('compact_signature_hex', 'compressed_pubkey_hex');
  const item = exactRecord(value, keys);
  const request: Record<string, unknown> = { operation, unsigned_tx_hex: raw(item.unsigned_tx_hex),
    expected_branch_id: hex(item.expected_branch_id, 8), input_amount_zat: uint(item.input_amount_zat, MAX_ZATOSHIS),
    prevout_script_hex: p2pkh(item.prevout_script_hex) };
  if (operation === 'finalize') {
    request.compact_signature_hex = hex(item.compact_signature_hex, 128);
    const pubkey = hex(item.compressed_pubkey_hex, 66);
    if (!/^(02|03)/.test(pubkey)) fail('public_key');
    request.compressed_pubkey_hex = pubkey;
  }
  return request;
}

function response(operation: string, value: unknown): ConstructResponse | DigestResponse | FinalizeResponse | OrchardPrepareResponse | OrchardVerifyResponse | OrchardFinalizeResponse | OrchardVerifySignedResponse {
  if (operation.startsWith('orchard_')) {
    const common = ['operation', 'fingerprint_sha256', 'sighash_all',
      'recipient_ciphertext_verified', 'orchard_proof_verified'];
    const keys = operation === 'orchard_prepare' ? [...common, 'actual_fee_zat', 'pczt_hex', 'txid_raw'] :
      operation === 'orchard_verify' ? [...common, 'actual_fee_zat', 'txid_raw'] :
      operation === 'orchard_finalize' ? [...common, 'signed_tx_hex', 'signed_txid_raw'] :
      [...common, 'signed_txid_raw'];
    const item = exactRecord(value, keys);
    if (item.operation !== operation || item.recipient_ciphertext_verified !== true ||
        item.orchard_proof_verified !== true) fail('orchard_response');
    hex(item.fingerprint_sha256, 64); hex(item.sighash_all, 64);
    if (operation === 'orchard_prepare' || operation === 'orchard_verify') {
      uint(item.actual_fee_zat, MAX_ZATOSHIS); hex(item.txid_raw, 64);
    }
    if (operation === 'orchard_prepare') raw(item.pczt_hex);
    if (operation === 'orchard_finalize') raw(item.signed_tx_hex);
    if (operation === 'orchard_finalize' || operation === 'orchard_verify_signed') hex(item.signed_txid_raw, 64);
    return item as unknown as OrchardPrepareResponse | OrchardVerifyResponse | OrchardFinalizeResponse | OrchardVerifySignedResponse;
  }
  const common = ['operation', 'sighash_all', 'actual_fee_zat', 'zip317_conventional_fee_zat'];
  const keys = operation === 'finalize' ? [...common, 'unsigned_txid_raw', 'signed_txid_raw',
    'der_signature_plus_type_hex', 'script_sig_hex', 'signed_tx_hex', 'callback_count'] : [...common, 'txid_raw'];
  if (operation === 'construct') keys.push('unsigned_tx_hex');
  const item = exactRecord(value, keys);
  if (item.operation !== operation) fail('operation');
  hex(item.sighash_all, 64);
  uint(item.actual_fee_zat, MAX_ZATOSHIS); uint(item.zip317_conventional_fee_zat, MAX_ZATOSHIS);
  if (operation !== 'finalize') hex(item.txid_raw, 64);
  if (operation === 'construct') raw(item.unsigned_tx_hex);
  if (operation === 'finalize') {
    hex(item.unsigned_txid_raw, 64); hex(item.signed_txid_raw, 64); raw(item.signed_tx_hex);
    for (const field of ['der_signature_plus_type_hex', 'script_sig_hex']) {
      if (typeof item[field] !== 'string' || item[field].length < 2 || item[field].length > 504 || item[field].length % 2) fail('authorization');
      hex(item[field], item[field].length);
    }
    if (item.callback_count !== 1) fail('callback');
  }
  return item as unknown as ConstructResponse | DigestResponse | FinalizeResponse;
}

function executableHash(path: string): string {
  const fd = openSync(path, 'r');
  try {
    if (!fstatSync(fd).isFile()) fail('executable');
    const digest = createHash('sha256'); const buffer = Buffer.alloc(64 * 1024);
    for (;;) { const count = readSync(fd, buffer, 0, buffer.length, null); if (count === 0) break; digest.update(buffer.subarray(0, count)); }
    return digest.digest('hex');
  } finally { closeSync(fd); }
}

/** Pinned native process boundary. Hash checking and path execution are not atomic. */
export class NativePaymentClient implements NativePaymentProvider {
  private readonly path: string; private readonly expectedHash: string;
  private readonly timeout: number; private readonly orchardTimeout: number;
  constructor(options: { executablePath: string; expectedSha256: string; timeoutMs?: number; orchardTimeoutMs?: number }) {
    if (typeof options?.executablePath !== 'string' || !isAbsolute(options.executablePath)) fail('configuration');
    this.path = options.executablePath; this.expectedHash = hex(options.expectedSha256, 64);
    this.timeout = uint(options.timeoutMs ?? 10000, 2_147_483_647);
    this.orchardTimeout = uint(options.orchardTimeoutMs ?? 600000, 2_147_483_647);
    if (this.timeout === 0 || this.orchardTimeout === 0) fail('configuration');
    Object.freeze(this);
  }
  private call(operation: string, request: unknown): ConstructResponse | DigestResponse | FinalizeResponse | OrchardPrepareResponse | OrchardVerifyResponse | OrchardFinalizeResponse | OrchardVerifySignedResponse {
    const input = Buffer.from(JSON.stringify(normalizeRequest(operation, request)));
    if (input.length > MAX_REQUEST_BYTES) fail('request_size');
    let digest: string;
    try { digest = executableHash(this.path); } catch { fail('executable'); }
    if (digest !== this.expectedHash) fail('executable_hash');
    let output: Buffer;
    try {
      output = execFileSync(this.path, [], { input, maxBuffer: MAX_OUTPUT_BYTES,
        timeout: operation.startsWith('orchard_') ? this.orchardTimeout : this.timeout,
        windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      const value = error as {code?: string; status?: number};
      if (value.code === 'ETIMEDOUT') fail('timeout');
      if (value.code === 'ENOBUFS' || value.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') fail('output_size');
      // No process failure is a successful or negative payment result.
      fail(value.status === 1 ? 'native_refusal' : 'execution');
    }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(output)); }
    catch { fail('response_encoding'); }
    return response(operation, parsed);
  }
  construct(request: ConstructRequest): ConstructResponse { return this.call('construct', request) as ConstructResponse; }
  digest(request: DigestRequest): DigestResponse { return this.call('digest', request) as DigestResponse; }
  finalize(request: FinalizeRequest): FinalizeResponse { return this.call('finalize', request) as FinalizeResponse; }
  orchardPrepare(request: OrchardPrepareRequest): OrchardPrepareResponse {
    return this.call('orchard_prepare', request) as OrchardPrepareResponse;
  }
  orchardVerify(request: OrchardVerifyRequest): OrchardVerifyResponse {
    return this.call('orchard_verify', request) as OrchardVerifyResponse;
  }
  orchardFinalize(request: OrchardFinalizeRequest): OrchardFinalizeResponse {
    return this.call('orchard_finalize', request) as OrchardFinalizeResponse;
  }
  orchardVerifySigned(request: OrchardVerifySignedRequest): OrchardVerifySignedResponse {
    return this.call('orchard_verify_signed', request) as OrchardVerifySignedResponse;
  }
}
