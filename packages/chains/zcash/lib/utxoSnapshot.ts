import {performance} from 'node:perf_hooks';
import {createZcashAddressCodec, type ZcashNetwork} from '@rosen-bridge/address-codec-zcash';
import {MAX_ZATOSHIS, type ZcashEvidenceSource, type ZcashSourcePolicy} from '@rosen-chains/zcash-payment';

export interface ZcashDiscoverySource extends ZcashEvidenceSource {
  getAddressUtxos(address: string): Promise<unknown>;
}
export interface ZcashUtxo {
  readonly txId: string;
  readonly index: number;
  readonly value: bigint;
  readonly scriptPubKeyHex: string;
  readonly height: number;
}
export interface ZcashUtxoSnapshotOptions {
  source: ZcashDiscoverySource;
  policy: ZcashSourcePolicy;
  address: string;
  maxUtxos?: number;
  maxAgeMs?: number;
  now?: () => number;
}
export class ZcashUtxoSnapshotError extends Error {
  constructor(readonly code: string) {
    super(`Zcash UTXO snapshot ${code} failure`);
    this.name = 'ZcashUtxoSnapshotError';
  }
}
function fail(code: string): never { throw new ZcashUtxoSnapshotError(code); }
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('shape');
  return value as Record<string, unknown>;
}
function own(value: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(value, key)) fail('shape');
  return value[key];
}
function integer(value: unknown, maximum = 0xffff_ffff, code = 'integer'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
    Object.is(value, -0) || value > maximum) fail(code);
  return value;
}
function hex(value: unknown, length = 64): string {
  if (typeof value !== 'string' || value.length !== length || !/^[0-9a-f]+$/.test(value)) fail('hex');
  return value;
}
interface Context {height: number; hash: string; nextBranch: string;}
type CaptureSource = Pick<ZcashDiscoverySource, 'getGenesisHash' | 'getBlockchainInfo' | 'getAddressUtxos'>;

/** A single observed chain list, retained for one selection attempt; not an input reservation. */
export class ZcashUtxoSnapshot {
  readonly #source: CaptureSource;
  readonly #policy: ZcashSourcePolicy;
  readonly #address: string;
  readonly #script: string;
  readonly #maxUtxos: number;
  readonly #maxAge: number;
  readonly #now: () => number;
  readonly #started: number;
  #lastTime: number;
  #expired = false;
  #context!: Context;
  #boxes: ReadonlyArray<ZcashUtxo> = [];

  private constructor(options: ZcashUtxoSnapshotOptions) {
    const policy = options?.policy;
    if (!policy || !['mainnet', 'testnet', 'regtest'].includes(policy.network)) fail('configuration');
    hex(policy.genesisHash);
    if (typeof policy.sourceId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(policy.sourceId)) fail('configuration');
    const minimumConfirmations = integer(policy.minimumConfirmations, 0xffff_ffff, 'configuration');
    const maximumExpiryDelta = integer(policy.maximumExpiryDelta, 0xffff_ffff, 'configuration');
    if (!minimumConfirmations || !maximumExpiryDelta || !Array.isArray(policy.branches) ||
      !policy.branches.length || policy.branches.length > 32) fail('configuration');
    let previous = -1;
    const branches = Array.from(policy.branches, entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('configuration');
      const height = integer(entry.height, 0xffff_ffff, 'configuration');
      const branchId = hex(entry.branchId, 8);
      if (height <= previous || (previous === -1 && height !== 0)) fail('configuration');
      previous = height;
      return Object.freeze({height, branchId});
    });
    this.#policy = Object.freeze({network: policy.network, genesisHash: policy.genesisHash, sourceId: policy.sourceId,
      minimumConfirmations, maximumExpiryDelta, branches: Object.freeze(branches)});
    let recipient;
    try { recipient = createZcashAddressCodec(this.#policy.network).parseAddress(options.address); }
    catch { fail('configuration'); }
    this.#address = recipient.address; this.#script = recipient.scriptPubKeyHex;
    this.#maxUtxos = integer(options.maxUtxos ?? 5000, 100_000, 'configuration');
    this.#maxAge = integer(options.maxAgeMs ?? 30_000, 300_000, 'configuration');
    if (!this.#maxUtxos || !this.#maxAge) fail('configuration');
    const now = options.now ?? (() => performance.now());
    if (typeof now !== 'function') fail('configuration');
    this.#now = now;
    const started = this.readTime();
    if (started < 0) fail('configuration');
    this.#started = started; this.#lastTime = started;
    const bound = {} as CaptureSource;
    for (const name of ['getGenesisHash', 'getBlockchainInfo', 'getAddressUtxos'] as const) {
      const method = options.source?.[name];
      if (typeof method !== 'function') fail('configuration');
      Object.defineProperty(bound, name, {value: method.bind(options.source), enumerable: true});
    }
    this.#source = Object.freeze(bound);
  }

  static async capture(options: ZcashUtxoSnapshotOptions): Promise<ZcashUtxoSnapshot> {
    const snapshot = new ZcashUtxoSnapshot(options);
    const before = await snapshot.context();
    const response = record(await snapshot.read(() => snapshot.#source.getAddressUtxos(snapshot.#address)));
    if (hex(own(response, 'hash')) !== before.hash || integer(own(response, 'height')) !== before.height) fail('context');
    const rows = own(response, 'utxos');
    if (!Array.isArray(rows)) fail('shape');
    if (rows.length > snapshot.#maxUtxos) fail('list_size');
    const seen = new Set<string>();
    let previousHeight = -1;
    const boxes = Array.from(rows, value => {
      const row = record(value);
      const txId = hex(own(row, 'txid'));
      const index = integer(own(row, 'outputIndex'));
      const amount = integer(own(row, 'satoshis'), MAX_ZATOSHIS);
      const height = integer(own(row, 'height'), before.height);
      if (height < previousHeight) fail('order');
      previousHeight = height;
      if (own(row, 'address') !== snapshot.#address || own(row, 'script') !== snapshot.#script) fail('output_join');
      const key = `${txId}:${index}`;
      if (seen.has(key)) fail('duplicate');
      seen.add(key);
      return Object.freeze({txId, index, value: BigInt(amount), scriptPubKeyHex: snapshot.#script, height});
    });
    const after = await snapshot.context();
    if (before.height !== after.height || before.hash !== after.hash || before.nextBranch !== after.nextBranch) fail('context');
    snapshot.#context = Object.freeze(before);
    snapshot.#boxes = Object.freeze(boxes);
    snapshot.assertFresh();
    Object.freeze(snapshot);
    return snapshot;
  }

  private branchAt(height: number): string {
    let id = this.#policy.branches[0].branchId;
    for (const entry of this.#policy.branches) { if (entry.height > height) break; id = entry.branchId; }
    return id;
  }
  private async read(call: () => Promise<unknown>): Promise<unknown> {
    try { return await call(); } catch { fail('source'); }
  }
  private async context(): Promise<Context> {
    if (hex(await this.read(() => this.#source.getGenesisHash())) !== this.#policy.genesisHash) fail('genesis');
    const info = record(await this.read(() => this.#source.getBlockchainInfo()));
    if (own(info, 'chain') !== (this.#policy.network === 'mainnet' ? 'main' : 'test')) fail('network');
    const height = integer(own(info, 'blocks'), 0xffff_fffe);
    const hash = hex(own(info, 'bestblockhash'));
    const consensus = record(own(info, 'consensus'));
    const tipBranch = hex(own(consensus, 'chaintip'), 8);
    const nextBranch = hex(own(consensus, 'nextblock'), 8);
    if (tipBranch !== this.branchAt(height) || nextBranch !== this.branchAt(height + 1)) fail('branch');
    return {height, hash, nextBranch};
  }
  private readTime(): number {
    let time: unknown;
    try { time = this.#now(); } catch { fail('configuration'); }
    if (typeof time !== 'number' || !Number.isFinite(time)) fail('configuration');
    return time;
  }
  assertFresh(): void {
    if (this.#expired) fail('expired');
    let time: number;
    try { time = this.readTime(); } catch { this.#expired = true; fail('expired'); }
    if (time < this.#lastTime || time - this.#started >= this.#maxAge) {
      this.#expired = true; fail('expired');
    }
    this.#lastTime = time;
  }
  get address(): string { return this.#address; }
  get network(): ZcashNetwork { return this.#policy.network; }
  get genesisHash(): string { return this.#policy.genesisHash; }
  get tipHash(): string { return this.#context.hash; }
  get tipHeight(): number { return this.#context.height; }
  get nextBranchId(): string { return this.#context.nextBranch; }
  async getAddressBoxes(address: string, offset: number, limit: number): Promise<ZcashUtxo[]> {
    this.assertFresh();
    if (address !== this.#address) fail('address');
    integer(offset, Number.MAX_SAFE_INTEGER, 'pagination');
    integer(limit, Number.MAX_SAFE_INTEGER, 'pagination');
    if (!limit) fail('pagination');
    const count = Math.min(limit, this.#boxes.length - Math.min(offset, this.#boxes.length));
    return this.#boxes.slice(offset, offset + count).map(box => ({...box}));
  }
}
