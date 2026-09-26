import {
  AbstractUtxoChainNetwork,
  type AssetBalance,
  type BlockInfo,
  type TokenDetail,
} from '@rosen-chains/abstract-chain';
import type {
  NativeInspectionProvider,
  ZcashRpcTransaction,
} from '@rosen-bridge/rosen-extractor';
import {
  MAX_ZATOSHIS,
  decimalZecToZatoshis,
  type ZcashSourcePolicy,
} from '@rosen-chains/zcash-payment';
import {
  ZcashUtxoSnapshot,
  type ZcashDiscoverySource,
  type ZcashUtxo,
} from './utxoSnapshot.js';

const MAX_RAW_HEX = 4_000_000;
const UINT32_MAX = 0xffff_ffff;
const DEFAULT_MAX_MEMPOOL = 5_000;
const MAX_MEMPOOL = 100_000;

type RecordValue = Record<string, unknown>;

export interface ZcashMempoolTransaction {
  readonly txid: string;
  readonly hex: string;
  readonly size: number;
  readonly consumedBoxIds: readonly string[];
}
export type ZcashNetworkTransaction = ZcashRpcTransaction | ZcashMempoolTransaction;

export type ZcashTransactionObservation =
  | Readonly<{kind: 'absent'}>
  | Readonly<{kind: 'mempool'; txId: string; hex: string}>
  | Readonly<{
      kind: 'confirmed';
      txId: string;
      hex: string;
      blockHash: string;
      height: number;
      confirmations: number;
    }>;

export interface ZcashBlockInfo extends BlockInfo {
  readonly transactionCount: number;
  readonly transactionIds: string[];
}

export interface ZcashChainSource extends ZcashDiscoverySource {
  getBlock(blockHash: string): Promise<unknown>;
  getUnboundTransaction(txid: string): Promise<unknown | null>;
  getMempoolEntries(): Promise<unknown>;
  sendRawTransaction(rawHex: string): Promise<unknown>;
}

export interface ZcashNetworkOptions {
  source: ZcashChainSource;
  policy: ZcashSourcePolicy;
  inspector: NativeInspectionProvider;
  maxUtxos?: number;
  maxAgeMs?: number;
  now?: () => number;
  maxMempoolTransactions?: number;
}

export interface ZcashSubmissionGuard {
  authorize(): Promise<void>;
  assertCurrent(): void;
}

export class ZcashNetworkError extends Error {
  constructor(readonly code: string) {
    super(`Zcash network ${code} failure`);
    this.name = 'ZcashNetworkError';
  }
}
function fail(code: string): never { throw new ZcashNetworkError(code); }
function record(value: unknown, code = 'shape'): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value as RecordValue;
}
function uint(value: unknown, maximum = UINT32_MAX, code = 'shape'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
      Object.is(value, -0) || value > maximum) fail(code);
  return value;
}
function hash(value: unknown, code = 'shape'): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail(code);
  return value;
}
function rawHex(value: unknown): string {
  if (typeof value !== 'string' || value.length < 2 || value.length > MAX_RAW_HEX ||
      !/^(?:[0-9a-f]{2})+$/.test(value)) fail('transaction');
  return value;
}
function exactBaseTransaction(value: unknown): {txid: string; hex: string; size: number; value: RecordValue} {
  const item = record(value, 'transaction');
  const txid = hash(item.txid, 'transaction');
  const hex = rawHex(item.hex);
  const size = uint(item.size, 2_000_000, 'transaction');
  if (size !== hex.length / 2) fail('transaction');
  return {txid, hex, size, value: item};
}
function copyPolicy(policy: ZcashSourcePolicy): ZcashSourcePolicy {
  if (!policy || typeof policy !== 'object' || !['mainnet', 'testnet', 'regtest'].includes(policy.network) ||
      typeof policy.sourceId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(policy.sourceId) ||
      !Array.isArray(policy.branches) || policy.branches.length < 1 || policy.branches.length > 32) fail('configuration');
  hash(policy.genesisHash, 'configuration');
  const minimumConfirmations = uint(policy.minimumConfirmations, UINT32_MAX, 'configuration');
  const maximumExpiryDelta = uint(policy.maximumExpiryDelta, UINT32_MAX, 'configuration');
  if (!minimumConfirmations || !maximumExpiryDelta) fail('configuration');
  let previous = -1;
  const branches = policy.branches.map(entry => {
    if (!entry || typeof entry !== 'object') fail('configuration');
    const height = uint(entry.height, UINT32_MAX, 'configuration');
    const branchId = typeof entry.branchId === 'string' && /^[0-9a-f]{8}$/.test(entry.branchId)
      ? entry.branchId : fail('configuration');
    if (height <= previous || (previous < 0 && height !== 0)) fail('configuration');
    previous = height;
    return Object.freeze({height, branchId});
  });
  if (Object.keys(branches).length !== branches.length) fail('configuration');
  return Object.freeze({
    network: policy.network,
    genesisHash: policy.genesisHash,
    sourceId: policy.sourceId,
    minimumConfirmations,
    maximumExpiryDelta,
    branches: Object.freeze(branches),
  });
}
function bindSource(source: ZcashChainSource): ZcashChainSource {
  const result = {} as ZcashChainSource;
  const methods = [
    'getGenesisHash', 'getBlockchainInfo', 'getAddressUtxos', 'getTxOut', 'getBlockHash',
    'getTransaction', 'getBlock', 'getUnboundTransaction', 'getMempoolEntries', 'sendRawTransaction',
  ] as const;
  for (const method of methods) {
    if (typeof source?.[method] !== 'function') fail('configuration');
    Object.defineProperty(result, method, {value: source[method].bind(source), enumerable: true});
  }
  return Object.freeze(result);
}

interface ChainContext {height: number; hash: string; tipBranch: string; nextBranch: string}

/** Network reads are evidence observations. They do not reserve UTXOs or authorize signing. */
export class ZcashNetwork extends AbstractUtxoChainNetwork<ZcashNetworkTransaction, ZcashUtxo> {
  readonly #source: ZcashChainSource;
  readonly #policy: ZcashSourcePolicy;
  readonly #inspector: NativeInspectionProvider;
  readonly #maxUtxos: number | undefined;
  readonly #maxAgeMs: number | undefined;
  readonly #now: (() => number) | undefined;
  readonly #maxMempool: number;

  constructor(options: ZcashNetworkOptions) {
    super();
    if (!options || typeof options !== 'object') fail('configuration');
    this.#source = bindSource(options.source);
    this.#policy = copyPolicy(options.policy);
    if (typeof options.inspector?.inspect !== 'function') fail('configuration');
    this.#inspector = Object.freeze({inspect: options.inspector.inspect.bind(options.inspector)});
    if (options.maxUtxos !== undefined) uint(options.maxUtxos, 100_000, 'configuration');
    if (options.maxAgeMs !== undefined) uint(options.maxAgeMs, 300_000, 'configuration');
    if (options.now !== undefined && typeof options.now !== 'function') fail('configuration');
    this.#maxUtxos = options.maxUtxos;
    this.#maxAgeMs = options.maxAgeMs;
    this.#now = options.now?.bind(options);
    this.#maxMempool = uint(options.maxMempoolTransactions ?? DEFAULT_MAX_MEMPOOL, MAX_MEMPOOL, 'configuration');
    if (!this.#maxMempool || options.maxUtxos === 0 || options.maxAgeMs === 0) fail('configuration');
    Object.freeze(this);
  }

  #branchAt(height: number): string {
    let branch = this.#policy.branches[0].branchId;
    for (const entry of this.#policy.branches) {
      if (entry.height > height) break;
      branch = entry.branchId;
    }
    return branch;
  }
  async #read<T>(call: () => Promise<T>): Promise<T> {
    try { return await call(); } catch (error) {
      if (error instanceof ZcashNetworkError) throw error;
      fail('source');
    }
  }
  async #context(): Promise<ChainContext> {
    const genesis = hash(await this.#read(() => this.#source.getGenesisHash()), 'context');
    if (genesis !== this.#policy.genesisHash) fail('context');
    const value = record(await this.#read(() => this.#source.getBlockchainInfo()), 'context');
    if (value.chain !== (this.#policy.network === 'mainnet' ? 'main' : 'test')) fail('context');
    const height = uint(value.blocks, 0xffff_fffe, 'context');
    const tipHash = hash(value.bestblockhash, 'context');
    const consensus = record(value.consensus, 'context');
    const tipBranch = typeof consensus.chaintip === 'string' && /^[0-9a-f]{8}$/.test(consensus.chaintip)
      ? consensus.chaintip : fail('context');
    const nextBranch = typeof consensus.nextblock === 'string' && /^[0-9a-f]{8}$/.test(consensus.nextblock)
      ? consensus.nextblock : fail('context');
    if (tipBranch !== this.#branchAt(height) || nextBranch !== this.#branchAt(height + 1)) fail('branch');
    return {height, hash: tipHash, tipBranch, nextBranch};
  }
  #sameContext(left: ChainContext, right: ChainContext): void {
    if (left.height !== right.height || left.hash !== right.hash || left.tipBranch !== right.tipBranch ||
        left.nextBranch !== right.nextBranch) fail('context');
  }
  #inspect(txid: string, hex: string, branch: string): void {
    const inspected = this.#inspector.inspect(hex, branch);
    if (inspected.txid !== txid) fail('identity');
  }
  async #block(blockId: string): Promise<ZcashBlockInfo> {
    hash(blockId, 'identity');
    const before = await this.#context();
    const value = record(await this.#read(() => this.#source.getBlock(blockId)), 'block');
    const blockHash = hash(value.hash, 'block');
    const parentHash = hash(value.previousblockhash, 'block');
    const height = uint(value.height, before.height, 'block');
    const confirmations = uint(value.confirmations, before.height + 1, 'block');
    const transactionCount = uint(value.nTx, 2_000_000, 'block');
    const ids = value.tx;
    if (blockHash !== blockId || confirmations < 1 || confirmations !== before.height - height + 1 ||
        !Array.isArray(ids) || ids.length < 1 || transactionCount !== ids.length) fail('block');
    const unique = new Set<string>();
    const transactionIds: string[] = [];
    for (const id of ids) {
      const checked = hash(id, 'block');
      if (unique.has(checked)) fail('block');
      unique.add(checked); transactionIds.push(checked);
    }
    const activeHash = hash(await this.#read(() => this.#source.getBlockHash(height)), 'block');
    if (activeHash !== blockId) fail('context');
    const after = await this.#context();
    this.#sameContext(before, after);
    return {hash: blockHash, parentHash, height, transactionCount, transactionIds};
  }
  #confirmed(value: unknown, requestedTxid: string, requestedBlock: string,
      context: ChainContext): ZcashRpcTransaction {
    const base = exactBaseTransaction(value);
    const blockhash = hash(base.value.blockhash, 'transaction');
    const height = uint(base.value.height, context.height, 'transaction');
    const confirmations = uint(base.value.confirmations, context.height + 1, 'transaction');
    if (base.txid !== requestedTxid || blockhash !== requestedBlock) fail('identity');
    if (base.value.in_active_chain !== true || confirmations < 1 ||
        confirmations !== context.height - height + 1) fail('confirmation');
    this.#inspect(base.txid, base.hex, this.#branchAt(height));
    return {txid: base.txid, hex: base.hex, size: base.size, blockhash, height};
  }
  #mempoolKeys(value: unknown): string[] {
    const entries = record(value, 'mempool');
    const keys = Object.keys(entries).sort();
    if (keys.length > this.#maxMempool) fail('mempool_size');
    for (const id of keys) {
      hash(id, 'mempool');
      record(entries[id], 'mempool');
    }
    return keys;
  }
  async #freshSnapshot(address: string): Promise<ZcashUtxoSnapshot> {
    return ZcashUtxoSnapshot.capture({
      source: this.#source,
      policy: this.#policy,
      address,
      maxUtxos: this.#maxUtxos,
      maxAgeMs: this.#maxAgeMs,
      now: this.#now,
    });
  }

  getHeight = async (): Promise<number> => (await this.#context()).height;

  getBlockTransactionIds = async (blockId: string): Promise<string[]> =>
    [...(await this.#block(blockId)).transactionIds];

  getBlockInfo = async (blockId: string): Promise<ZcashBlockInfo> => {
    const block = await this.#block(blockId);
    return {...block, transactionIds: [...block.transactionIds]};
  };

  getTransaction = async (transactionId: string, blockId: string): Promise<ZcashRpcTransaction> => {
    hash(transactionId, 'identity'); hash(blockId, 'identity');
    const before = await this.#context();
    const value = await this.#read(() => this.#source.getTransaction(transactionId, blockId));
    const transaction = this.#confirmed(value, transactionId, blockId, before);
    this.#sameContext(before, await this.#context());
    return transaction;
  };

  async #observeTransaction(transactionId: string): Promise<ZcashTransactionObservation> {
    hash(transactionId, 'identity');
    const before = await this.#context();
    const value = await this.#read(() => this.#source.getUnboundTransaction(transactionId));
    if (value === null) {
      const keys = this.#mempoolKeys(await this.#read(() => this.#source.getMempoolEntries()));
      if (keys.includes(transactionId)) fail('mempool');
      this.#sameContext(before, await this.#context());
      return Object.freeze({kind: 'absent'});
    }
    const base = exactBaseTransaction(value);
    if (base.txid !== transactionId) fail('identity');
    const hasBlockHash = Object.hasOwn(base.value, 'blockhash');
    const hasHeight = Object.hasOwn(base.value, 'height');
    if (!hasBlockHash && !hasHeight) {
      if (Object.hasOwn(base.value, 'confirmations') || base.value.in_active_chain !== false) fail('mempool');
      const inspected = this.#inspector.inspect(base.hex, before.nextBranch);
      if (inspected.txid !== base.txid || inspected.coinbase) fail('identity');
      const keys = this.#mempoolKeys(await this.#read(() => this.#source.getMempoolEntries()));
      if (!keys.includes(transactionId)) fail('mempool');
      this.#sameContext(before, await this.#context());
      return Object.freeze({kind: 'mempool', txId: base.txid, hex: base.hex});
    }
    if (!hasBlockHash || !hasHeight) fail('confirmation');
    const blockhash = hash(base.value.blockhash, 'transaction');
    const height = uint(base.value.height, before.height, 'transaction');
    const confirmations = uint(base.value.confirmations, before.height + 1, 'transaction');
    if (base.value.in_active_chain !== true || confirmations < 1 || confirmations !== before.height - height + 1) {
      fail('confirmation');
    }
    this.#inspect(base.txid, base.hex, this.#branchAt(height));
    const block = await this.#block(blockhash);
    if (block.height !== height || !block.transactionIds.includes(transactionId)) fail('identity');
    this.#sameContext(before, await this.#context());
    return Object.freeze({
      kind: 'confirmed',
      txId: base.txid,
      hex: base.hex,
      blockHash: blockhash,
      height,
      confirmations,
    });
  }

  getTxConfirmation = async (transactionId: string): Promise<number> => {
    const observation = await this.#observeTransaction(transactionId);
    if (observation.kind === 'absent') return -1;
    if (observation.kind === 'mempool') return 0;
    return observation.confirmations;
  };

  observeSignedTransaction = async (
    transactionId: string,
    expectedSignedHex: string,
  ): Promise<ZcashTransactionObservation> => {
    const expected = rawHex(expectedSignedHex);
    const observation = await this.#observeTransaction(transactionId);
    if (observation.kind !== 'absent' && observation.hex !== expected) fail('identity');
    return observation;
  };

  getMempoolTransactions = async (): Promise<ZcashMempoolTransaction[]> => {
    const before = await this.#context();
    const ids = this.#mempoolKeys(await this.#read(() => this.#source.getMempoolEntries()));
    const consumed = new Set<string>();
    const transactions: ZcashMempoolTransaction[] = [];
    for (const id of ids) {
      const value = await this.#read(() => this.#source.getUnboundTransaction(id));
      if (value === null) fail('mempool');
      const base = exactBaseTransaction(value);
      if (base.txid !== id || Object.hasOwn(base.value, 'blockhash') || Object.hasOwn(base.value, 'height') ||
          Object.hasOwn(base.value, 'confirmations') || base.value.in_active_chain !== false) fail('mempool');
      const inspected = this.#inspector.inspect(base.hex, before.nextBranch);
      if (inspected.txid !== id || inspected.coinbase) fail('identity');
      const consumedBoxIds = inspected.transparent.inputs.map(input => `${input.prevout_txid}.${input.prevout_index}`);
      for (const boxId of consumedBoxIds) {
        if (consumed.has(boxId)) fail('mempool');
        consumed.add(boxId);
      }
      transactions.push(Object.freeze({txid: id, hex: base.hex, size: base.size,
        consumedBoxIds: Object.freeze(consumedBoxIds)}));
    }
    const afterIds = this.#mempoolKeys(await this.#read(() => this.#source.getMempoolEntries()));
    if (ids.length !== afterIds.length || ids.some((id, index) => id !== afterIds[index])) fail('mempool');
    this.#sameContext(before, await this.#context());
    return transactions;
  };

  /** Each call captures its own list. Cross-page ownership belongs to ZcashPaymentPlanner. */
  getAddressBoxes = async (address: string, offset: number, limit: number): Promise<ZcashUtxo[]> =>
    (await this.#freshSnapshot(address)).getAddressBoxes(address, offset, limit);

  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    const snapshot = await this.#freshSnapshot(address);
    const boxes = await snapshot.getAddressBoxes(address, 0, this.#maxUtxos ?? 5_000);
    const nativeToken = boxes.reduce((sum, box) => sum + box.value, 0n);
    if (nativeToken > BigInt(MAX_ZATOSHIS)) fail('amount');
    return {nativeToken, tokens: []};
  };

  /** A true result is a current, confirmed P2PKH candidate, not complete prevout authority. */
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    if (typeof boxId !== 'string') fail('box_id');
    const match = /^([0-9a-f]{64})\.([0-9]+)$/.exec(boxId);
    if (!match) fail('box_id');
    const index = Number(match[2]);
    if (!Number.isSafeInteger(index) || index < 0 || index > UINT32_MAX || String(index) !== match[2]) fail('box_id');
    const before = await this.#context();
    const value = await this.#read(() => this.#source.getTxOut(match[1], index));
    const after = await this.#context();
    this.#sameContext(before, after);
    if (value === null) return false;
    const output = record(value, 'box');
    if (hash(output.bestblock, 'box') !== before.hash) fail('context');
    const confirmations = uint(output.confirmations, before.height + 1, 'box');
    if (typeof output.coinbase !== 'boolean') fail('box');
    uint(output.version, UINT32_MAX, 'box');
    let amount: bigint;
    try {
      amount = decimalZecToZatoshis(output.value);
      if (amount < 0n || amount > BigInt(MAX_ZATOSHIS)) fail('box');
    } catch (error) { if (error instanceof ZcashNetworkError) throw error; fail('box'); }
    const script = record(output.scriptPubKey, 'box').hex;
    if (typeof script !== 'string' || script.length < 2 || script.length > MAX_RAW_HEX ||
        !/^(?:[0-9a-f]{2})+$/.test(script)) fail('box');
    if (output.coinbase || confirmations < this.#policy.minimumConfirmations || amount === 0n ||
        !/^76a914[0-9a-f]{40}88ac$/.test(script)) return false;
    return true;
  };

  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    if (tokenId !== 'zec') fail('token');
    return {tokenId: 'zec', name: 'Zcash', decimals: 8};
  };

  getActualTxId = async (txid: string): Promise<string> => hash(txid, 'identity');

  submitTransaction = async (
    transaction: string,
    hook?: ZcashSubmissionGuard,
    expectedOrchard = false,
  ): Promise<void> => {
    const hex = rawHex(transaction);
    let authorize: (() => Promise<void>) | undefined;
    let assertCurrent: (() => void) | undefined;
    if (hook !== undefined) {
      if (
        !hook ||
        typeof hook !== 'object' ||
        typeof hook.authorize !== 'function' ||
        typeof hook.assertCurrent !== 'function'
      ) fail('configuration');
      authorize = hook.authorize.bind(hook);
      assertCurrent = hook.assertCurrent.bind(hook);
    }
    const before = await this.#context();
    const inspected = this.#inspector.inspect(hex, before.nextBranch);
    if (inspected.coinbase || inspected.version.kind !== 'v5' || inspected.version.number !== 5 ||
        inspected.fully_transparent === expectedOrchard ||
        inspected.shielded.present !== expectedOrchard || !inspected.transparent.present ||
        inspected.transparent.inputs.length !== 1 || inspected.transparent.outputs.length < 1 ||
        inspected.transparent.inputs.some(input => input.script_sig_hex.length === 0)) fail('transaction');
    if (inspected.expiry_height <= before.height || inspected.expiry_height > 499_999_999 ||
        inspected.expiry_height - before.height > this.#policy.maximumExpiryDelta) fail('expiry');
    if (authorize !== undefined) await authorize();
    assertCurrent?.();
    const submission = this.#read(() => this.#source.sendRawTransaction(hex));
    const result = hash(await submission, 'submit');
    if (result !== inspected.txid) fail('identity');
    this.#sameContext(before, await this.#context());
  };
}
