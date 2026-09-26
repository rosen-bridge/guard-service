import {createHash} from 'node:crypto';
import type {ZcashNetwork} from '@rosen-bridge/address-codec-zcash';
import type {NativeInspectionProvider} from '@rosen-bridge/rosen-extractor';
import {MAX_ZATOSHIS} from './nativePayment.js';
import {ZcashTransaction} from './zcashTransaction.js';

export interface ZcashEvidenceSource {
  getGenesisHash(): Promise<unknown>;
  getBlockchainInfo(): Promise<unknown>;
  getTxOut(txid: string, index: number): Promise<unknown>;
  getBlockHash(height: number): Promise<unknown>;
  getTransaction(txid: string, blockHash: string): Promise<unknown>;
}
export interface ZcashSourcePolicy {
  network: ZcashNetwork;
  genesisHash: string;
  sourceId: string;
  branches: ReadonlyArray<{height: number; branchId: string}>;
  minimumConfirmations: number;
  maximumExpiryDelta: number;
}
export class ZcashPaymentEvidenceError extends Error {
  constructor(readonly code: string) { super('Zcash payment evidence ' + code + ' failure'); this.name = 'ZcashPaymentEvidenceError'; }
}
function reject(code: string): never { throw new ZcashPaymentEvidenceError(code); }
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) reject('shape');
  return value as Record<string, unknown>;
}
function own(value: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(value, key)) reject('shape');
  return value[key];
}
function integer(value: unknown, maximum = 0xffff_ffff): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > maximum || Object.is(value, -0)) reject('integer');
  return value;
}
function hash(value: unknown, length = 64): string {
  if (typeof value !== 'string' || value.length !== length || !/^[0-9a-f]+$/.test(value)) reject('hex');
  return value;
}

/** Exact numeric lexeme supplied by the RPC adapter; no floating-point rounding. */
export function decimalZecToZatoshis(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 80) reject('amount_lexeme');
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(value);
  if (!match) reject('amount_lexeme');
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 30) reject('amount_lexeme');
  const digits = BigInt(match[1] + fraction);
  const shift = 8 + exponent - fraction.length;
  let zatoshis: bigint;
  if (shift >= 0) zatoshis = digits * 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    if (digits % divisor !== 0n) reject('amount_precision');
    zatoshis = digits / divisor;
  }
  if (zatoshis > BigInt(MAX_ZATOSHIS)) reject('amount_range');
  return zatoshis;
}

interface ChainContext { height: number; tipHash: string; tipBranch: string; nextBranch: string; }
export interface ZcashPaymentEvidenceReceipt {
  readonly kind: 'consistent-source-observation';
  readonly sourceId: string;
  readonly network: ZcashNetwork;
  readonly genesisHash: string;
  readonly candidateSha256: string;
  readonly tipHash: string;
  readonly tipHeight: number;
  readonly candidateBranchId: string;
  readonly previousBranchId: string;
  readonly previousBlockHash: string;
  readonly previousHeight: number;
  readonly confirmations: number;
  readonly outpoint: string;
  readonly amountZat: string;
  readonly scriptPubKeyHex: string;
}

/** Compares one source's observations. It does not reserve funds or make RPC reads atomic. */
export class ZcashPaymentEvidence {
  readonly #source: ZcashEvidenceSource;
  readonly #inspect: NativeInspectionProvider['inspect'];
  readonly #policy: ZcashSourcePolicy;
  constructor(source: ZcashEvidenceSource, inspector: NativeInspectionProvider, policy: ZcashSourcePolicy) {
    if (!['mainnet','testnet','regtest'].includes(policy?.network)) reject('configuration');
    hash(policy.genesisHash);
    if (typeof policy.sourceId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(policy.sourceId)) reject('configuration');
    const minimumConfirmations = integer(policy.minimumConfirmations);
    const maximumExpiryDelta = integer(policy.maximumExpiryDelta);
    if (minimumConfirmations < 1 || maximumExpiryDelta < 1 || !Array.isArray(policy.branches) ||
      policy.branches.length < 1 || policy.branches.length > 32 || policy.branches[0]?.height !== 0) reject('configuration');
    let previous = -1;
    const branches = Array.from(policy.branches, branch => {
      const height = integer(branch.height); const branchId = hash(branch.branchId, 8);
      if (height <= previous) reject('configuration');
      previous = height;
      return Object.freeze({height, branchId});
    });
    this.#policy = Object.freeze({network: policy.network, genesisHash: policy.genesisHash, sourceId: policy.sourceId,
      branches: Object.freeze(branches), minimumConfirmations, maximumExpiryDelta});
    const bound = {} as ZcashEvidenceSource;
    for (const method of ['getGenesisHash','getBlockchainInfo','getTxOut','getBlockHash','getTransaction'] as const) {
      if (typeof source?.[method] !== 'function') reject('configuration');
      Object.defineProperty(bound, method, {value: source[method].bind(source), enumerable: true});
    }
    if (typeof inspector?.inspect !== 'function') reject('configuration');
    this.#source = Object.freeze(bound); this.#inspect = inspector.inspect.bind(inspector);
    Object.freeze(this);
  }
  private branchAt(height: number): string {
    let result = this.#policy.branches[0].branchId;
    for (const branch of this.#policy.branches) { if (branch.height > height) break; result = branch.branchId; }
    return result;
  }
  private async read<T>(call: () => Promise<T>): Promise<T> {
    try { return await call(); } catch { reject('source'); }
  }
  private async context(): Promise<ChainContext> {
    if (hash(await this.read(() => this.#source.getGenesisHash())) !== this.#policy.genesisHash) reject('genesis');
    const info = record(await this.read(() => this.#source.getBlockchainInfo()));
    // Zebra's BIP70 name is "test" for both Testnet and Regtest. Genesis binds the configured network.
    if (own(info, 'chain') !== (this.#policy.network === 'mainnet' ? 'main' : 'test')) reject('network');
    const height = integer(own(info, 'blocks'), 0xffff_fffe);
    const tipHash = hash(own(info, 'bestblockhash'));
    const consensus = record(own(info, 'consensus'));
    const tipBranch = hash(own(consensus, 'chaintip'), 8), nextBranch = hash(own(consensus, 'nextblock'), 8);
    if (tipBranch !== this.branchAt(height) || nextBranch !== this.branchAt(height + 1)) reject('branch');
    return {height, tipHash, tipBranch, nextBranch};
  }
  async check(transaction: ZcashTransaction): Promise<ZcashPaymentEvidenceReceipt> {
    if (!(transaction instanceof ZcashTransaction)) reject('candidate');
    // All values read before the first source await come from the immutable native-validated model.
    const intent = transaction.getIntent();
    const candidateSha256 = createHash('sha256').update(transaction.toJson()).digest('hex');
    const digest = transaction.getDigest();
    if (intent.network !== this.#policy.network) reject('network');
    if (intent.lockTime !== 0 || intent.sequence !== (intent.orchard ? 0xffff_ffff : 0xffff_fffe))
      reject('lock_policy');
    if (digest.actual_fee_zat < digest.zip317_conventional_fee_zat) reject('fee_policy');
    const before = await this.context();
    if (intent.branchId !== before.nextBranch) reject('candidate_branch');
    if (intent.expiryHeight > 499_999_999 || intent.expiryHeight < before.height + 1 ||
      intent.expiryHeight - before.height > this.#policy.maximumExpiryDelta) reject('expiry_policy');
    const unavailable = await this.read(() => this.#source.getTxOut(intent.input.txid, intent.input.index));
    if (unavailable === null) reject('unavailable_prevout');
    const txout = record(unavailable);
    if (hash(own(txout, 'bestblock')) !== before.tipHash) reject('tip');
    const confirmations = integer(own(txout, 'confirmations'));
      if (confirmations > before.height + 1) reject('confirmations');
      if (confirmations < this.#policy.minimumConfirmations) reject('insufficient_confirmations');
    if (own(txout, 'coinbase') === true) reject('unsupported_coinbase');
    if (own(txout, 'coinbase') !== false) reject('shape');
    const outputVersion = integer(own(txout, 'version'));
    const outputScript = own(record(own(txout, 'scriptPubKey')), 'hex');
    const outputAmount = decimalZecToZatoshis(own(txout, 'value'));
    if (outputScript !== intent.input.scriptPubKeyHex || outputAmount !== intent.input.amountZat) reject('utxo_join');
    const previousHeight = before.height - confirmations + 1;
    const previousBlockHash = hash(await this.read(() => this.#source.getBlockHash(previousHeight)));
    const previousBranchId = this.branchAt(previousHeight);
    const previous = record(await this.read(() => this.#source.getTransaction(intent.input.txid, previousBlockHash)));
    if (own(previous, 'in_active_chain') !== true || hash(own(previous, 'txid')) !== intent.input.txid ||
      hash(own(previous, 'blockhash')) !== previousBlockHash || integer(own(previous, 'height')) !== previousHeight ||
      integer(own(previous, 'confirmations')) !== confirmations) reject('previous_context');
    const raw = own(previous, 'hex');
    if (typeof raw !== 'string' || raw.length < 2 || raw.length > 4_000_000 || raw.length % 2 || !/^[0-9a-f]+$/.test(raw)) reject('raw');
    if (integer(own(previous, 'size'), 2_000_000) !== raw.length / 2) reject('raw_size');
    const native = this.#inspect(raw, previousBranchId);
    if (native.txid !== intent.input.txid || native.consensus_branch_id !== previousBranchId ||
      native.version.number !== outputVersion || !native.transparent.present) reject('native_identity');
    if (native.coinbase) reject('unsupported_coinbase');
    const selected = native.transparent.outputs[intent.input.index];
    if (!selected || selected.index !== intent.input.index || selected.script_kind !== 'pubkeyhash' ||
      BigInt(selected.value_zat) !== intent.input.amountZat || selected.script_pubkey_hex !== intent.input.scriptPubKeyHex) reject('native_output');
    // The selected transparent output can come from a transaction with other shielded components.
    const vouts = own(previous, 'vout');
    if (!Array.isArray(vouts) || vouts.length !== native.transparent.outputs.length) reject('previous_outputs');
    const vout = record(vouts[intent.input.index]);
    if (integer(own(vout, 'n')) !== intent.input.index ||
      BigInt(integer(own(vout, 'valueZat'), MAX_ZATOSHIS)) !== intent.input.amountZat ||
      own(record(own(vout, 'scriptPubKey')), 'hex') !== intent.input.scriptPubKeyHex) reject('previous_output');
    const after = await this.context();
    if (JSON.stringify(before) !== JSON.stringify(after)) reject('context_changed');
    return Object.freeze({kind: 'consistent-source-observation', sourceId: this.#policy.sourceId,
      network: this.#policy.network, genesisHash: this.#policy.genesisHash, candidateSha256,
      tipHash: before.tipHash, tipHeight: before.height, candidateBranchId: before.nextBranch,
      previousBranchId, previousBlockHash, previousHeight, confirmations,
      outpoint: intent.input.txid + ':' + intent.input.index, amountZat: intent.input.amountZat.toString(),
      scriptPubKeyHex: intent.input.scriptPubKeyHex});
  }
}
