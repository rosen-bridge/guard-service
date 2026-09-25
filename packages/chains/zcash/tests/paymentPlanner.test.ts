import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {NotEnoughValidBoxesError, TransactionType, type PaymentOrder} from '@rosen-chains/abstract-chain';
import {NativeZcashInspector, type NativeInspectionProvider} from '@rosen-bridge/rosen-extractor';
import {
  NativePaymentClient,
  ZcashPaymentEvidenceError,
  type NativePaymentProvider,
  type ZcashSourcePolicy,
} from '@rosen-chains/zcash-payment';
import {ZcashPaymentPlanner, ZcashPaymentPlannerError} from '../lib/paymentPlanner.js';
import {ZcashUtxoSnapshotError, type ZcashDiscoverySource} from '../lib/utxoSnapshot.js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  assert.ok(value, `${name} is required for native planner tests`);
  return value;
}
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8')) as T;
}
function clone<T>(value: T): T { return structuredClone(value); }

interface Observation {method: string; arguments: unknown[]; result: unknown}
interface LiveReceipt {
  policy: ZcashSourcePolicy;
  positive: {tipHash: string; tipHeight: number; outpoint: string; amountZat: string; scriptPubKeyHex: string};
  unsignedTxHex: string;
  observations: Observation[];
}
interface DeliveredBlock {transactions: Array<Record<string, unknown>>}

const live = fixture<LiveReceipt>('payment-planner-live-evidence.json');
const block106 = fixture<DeliveredBlock>('payment-planner-block-106.json');
const [LIVE_TXID, LIVE_INDEX_TEXT] = live.positive.outpoint.split(':');
const LIVE_INDEX = Number(LIVE_INDEX_TEXT);
const RESERVE = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const PAYOUT = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const FAKE_A = '11'.repeat(32), FAKE_B = '22'.repeat(32);

const native = new NativePaymentClient({
  executablePath: requiredEnvironment('ZCASH_PAYMENT_BIN'),
  expectedSha256: requiredEnvironment('ZCASH_PAYMENT_SHA256'),
});
const inspector = new NativeZcashInspector({
  executablePath: requiredEnvironment('ZCASH_INSPECTOR_BIN'),
  expectedSha256: requiredEnvironment('ZCASH_INSPECTOR_SHA256'),
});

function observed(method: string): unknown {
  const found = live.observations.find(observation => observation.method === method);
  assert.ok(found, `retained observation ${method}`);
  return clone(found.result);
}
function liveRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    address: RESERVE,
    txid: LIVE_TXID,
    outputIndex: LIVE_INDEX,
    script: live.positive.scriptPubKeyHex,
    satoshis: Number(live.positive.amountZat),
    height: live.positive.tipHeight,
    ...overrides,
  };
}

interface SourceControls {
  rows: Array<Record<string, unknown>>;
  txouts: Map<string, unknown>;
  transactions: Map<string, unknown>;
  info: Record<string, unknown>;
  clockOnTxOut?: () => void;
}
function controlledSource(change: (state: SourceControls) => void = () => undefined): {
  source: ZcashDiscoverySource; state: SourceControls; calls: string[];
} {
  const liveTxOut = observed('getTxOut');
  const liveTransaction = observed('getTransaction');
  const state: SourceControls = {
    rows: [liveRow()],
    txouts: new Map([[`${LIVE_TXID}.${LIVE_INDEX}`, liveTxOut]]),
    transactions: new Map([[LIVE_TXID, liveTransaction]]),
    info: observed('getBlockchainInfo') as Record<string, unknown>,
  };
  change(state);
  const calls: string[] = [];
  const result = async (label: string, value: unknown): Promise<unknown> => {
    calls.push(label);
    if (value instanceof Error) throw value;
    return clone(value);
  };
  const source: ZcashDiscoverySource = {
    getGenesisHash: () => result('genesis', observed('getGenesisHash')),
    getBlockchainInfo: () => result('info', state.info),
    getAddressUtxos: address => result(`utxos:${address}`, {
      utxos: state.rows, hash: live.positive.tipHash, height: live.positive.tipHeight,
    }),
    getTxOut: (txid, index) => {
      state.clockOnTxOut?.();
      return result(`txout:${txid}.${index}`, state.txouts.get(`${txid}.${index}`) ?? null);
    },
    getBlockHash: height => result(`blockhash:${height}`, live.positive.tipHash),
    getTransaction: (txid, blockHash) => result(`transaction:${txid}:${blockHash}`, state.transactions.get(txid)),
  };
  return {source, state, calls};
}

function policy(): ZcashSourcePolicy { return clone(live.policy); }
function order(value = 10_000_000n): PaymentOrder {
  return [{address: PAYOUT, assets: {nativeToken: value, tokens: []}}];
}
function splitOrder(total: bigint, count: number): PaymentOrder {
  const each = total / BigInt(count), remainder = total % BigInt(count);
  return Array.from({length: count}, (_, index) => ({
    address: PAYOUT,
    assets: {nativeToken: each + (index === count - 1 ? remainder : 0n), tokens: []},
  }));
}
function planner(source: ZcashDiscoverySource, overrides: Partial<{
  native: NativePaymentProvider; inspector: NativeInspectionProvider; feeFloorZat: bigint;
  maximumFeeZat: bigint; expiryDelta: number; minimumOutputZat: bigint;
  maxAgeMs: number; now: () => number;
}> = {}): ZcashPaymentPlanner {
  return new ZcashPaymentPlanner({
    source, policy: policy(), native, inspector, reserveAddress: RESERVE,
    feeFloorZat: 10_000n, maximumFeeZat: 20_000n, expiryDelta: 200,
    ...overrides,
  });
}
const eventId = '33'.repeat(32);

test('actual Rosen selection returns one native-validated input and retained golden bytes', async () => {
  const f = controlledSource();
  const result = await planner(f.source).plan(eventId, TransactionType.payment, order(), []);
  assert.equal(result.transaction.getUnsignedHex(), live.unsignedTxHex);
  assert.equal(result.transaction.getIntent().input.txid, LIVE_TXID);
  assert.equal(result.transaction.getIntent().input.index, LIVE_INDEX);
  assert.equal(result.transaction.getIntent().feeZat, 10_000n);
  assert.equal(result.evidence.outpoint, `${LIVE_TXID}:${LIVE_INDEX}`);
  const inspected = inspector.inspect(result.transaction.getUnsignedHex(), result.transaction.getIntent().branchId);
  assert.equal(inspected.transparent.inputs.length, 1);
});

test('two inputs that cover only in aggregate remain insufficient under the one-input constructor', async () => {
  const f = controlledSource(state => {
    state.rows = [liveRow({txid: FAKE_A, satoshis: 30_000_000}), liveRow({txid: FAKE_B, satoshis: 30_000_000})];
    state.txouts.clear();
  });
  await assert.rejects(
    planner(f.source).plan(eventId, TransactionType.payment, order(40_000_000n), []),
    NotEnoughValidBoxesError,
  );
  assert.equal(f.calls.some(call => call.startsWith('txout:')), false);
});

test('forbidden IDs are exact, duplicate-safe, and malformed IDs fail before source access', async () => {
  const f = controlledSource();
  const forbidden = `${LIVE_TXID}.${LIVE_INDEX}`;
  await assert.rejects(planner(f.source).plan(eventId, TransactionType.payment, order(), [forbidden, forbidden]),
    NotEnoughValidBoxesError);
  const untouched = controlledSource();
  await assert.rejects(planner(untouched.source).plan(eventId, TransactionType.payment, order(), ['bad']),
    (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'forbidden_boxes');
  assert.deepEqual(untouched.calls, []);
});

test('a forbidden first row performs no native or source work and cannot block an eligible later row', async () => {
  const f = controlledSource(state => {
    state.rows = [liveRow({txid: FAKE_A}), liveRow()];
    state.txouts.set(`${FAKE_A}.${LIVE_INDEX}`, new Error('forbidden source must remain unread'));
  });
  let forbiddenConstructs = 0;
  const counted: NativePaymentProvider = {
    construct(request) {
      if (request.input.prevout_txid === FAKE_A) forbiddenConstructs++;
      return native.construct(request);
    },
    digest: request => native.digest(request),
    finalize: request => native.finalize(request),
  };
  const result = await planner(f.source, {native: counted}).plan(
    eventId, TransactionType.payment, order(), [`${FAKE_A}.${LIVE_INDEX}`]);
  assert.equal(result.evidence.outpoint, `${LIVE_TXID}:${LIVE_INDEX}`);
  assert.equal(forbiddenConstructs, 0);
  assert.equal(f.calls.includes(`txout:${FAKE_A}.${LIVE_INDEX}`), false);
});

test('source amount, script, and raw transaction contradictions propagate distinctly from insufficient funds', async t => {
  await t.test('amount', async () => {
    const f = controlledSource(state => {
      const txout = clone(state.txouts.get(`${LIVE_TXID}.${LIVE_INDEX}`)) as any;
      txout.value = '0.59990001'; state.txouts.set(`${LIVE_TXID}.${LIVE_INDEX}`, txout);
    });
    await assert.rejects(planner(f.source).plan(eventId, TransactionType.payment, order(), []),
      (error: unknown) => error instanceof ZcashPaymentEvidenceError && error.code === 'utxo_join');
  });
  await t.test('script', async () => {
    const f = controlledSource(state => {
      const txout = clone(state.txouts.get(`${LIVE_TXID}.${LIVE_INDEX}`)) as any;
      txout.scriptPubKey.hex = '76a914' + '44'.repeat(20) + '88ac';
      state.txouts.set(`${LIVE_TXID}.${LIVE_INDEX}`, txout);
    });
    await assert.rejects(planner(f.source).plan(eventId, TransactionType.payment, order(), []),
      (error: unknown) => error instanceof ZcashPaymentEvidenceError && error.code === 'utxo_join');
  });
  await t.test('raw bytes', async () => {
    const other = block106.transactions.find(tx => tx.txid !== LIVE_TXID && tx.coinbase === undefined) ?? block106.transactions[1];
    const f = controlledSource(state => {
      const previous = clone(state.transactions.get(LIVE_TXID)) as any;
      previous.hex = other.hex; previous.size = other.size;
      state.transactions.set(LIVE_TXID, previous);
    });
    await assert.rejects(planner(f.source).plan(eventId, TransactionType.payment, order(), []),
      (error: unknown) => error instanceof ZcashPaymentEvidenceError && error.code === 'native_identity');
  });
});

test('an unavailable listed output is skipped and the next independently eligible output is selected', async () => {
  const f = controlledSource(state => {
    state.rows = [liveRow({txid: FAKE_A}), liveRow()];
  });
  const result = await planner(f.source).plan(eventId, TransactionType.payment, order(), []);
  assert.equal(result.evidence.outpoint, `${LIVE_TXID}:${LIVE_INDEX}`);
  assert.ok(f.calls.includes(`txout:${FAKE_A}.${LIVE_INDEX}`));
  assert.ok(f.calls.includes(`txout:${LIVE_TXID}.${LIVE_INDEX}`));
});

test('native conventional fee raises the floor and an explicit maximum fee cap fails closed', async () => {
  const f = controlledSource(); let constructs = 0;
  const counted: NativePaymentProvider = {
    construct(request) { constructs++; return native.construct(request); },
    digest: request => native.digest(request),
    finalize: request => native.finalize(request),
  };
  const result = await planner(f.source, {native: counted, feeFloorZat: 5_000n}).plan(
    eventId, TransactionType.payment, order(), []);
  assert.equal(result.transaction.getIntent().feeZat, 10_000n);
  assert.equal(constructs, 2);
  const capped = controlledSource();
  await assert.rejects(
    planner(capped.source, {feeFloorZat: 5_000n, maximumFeeZat: 9_999n}).plan(
      eventId, TransactionType.payment, order(), []),
    (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'fee_cap',
  );
});

test('fee qualification handles output-shape changes and exact zero-change candidates', async t => {
  await t.test('twenty-thousand spare remains a valid three-output candidate without oscillation', async () => {
    const f = controlledSource();
    const result = await planner(f.source).plan(eventId, TransactionType.payment,
      splitOrder(BigInt(live.positive.amountZat) - 20_000n, 3), []);
    assert.equal(result.transaction.getIntent().feeZat, 20_000n);
    assert.equal(inspector.inspect(result.transaction.getUnsignedHex(), result.transaction.getIntent().branchId)
      .transparent.outputs.length, 3);
  });
  await t.test('fifteen-thousand spare selects the exact conventional zero-change shape', async () => {
    const f = controlledSource();
    const result = await planner(f.source).plan(eventId, TransactionType.payment,
      splitOrder(BigInt(live.positive.amountZat) - 15_000n, 3), []);
    assert.equal(result.transaction.getIntent().feeZat, 15_000n);
    assert.equal(result.transaction.getDigest().zip317_conventional_fee_zat, 15_000);
  });
  await t.test('maximum payment count can use an exact no-change shape', async () => {
    const conventionalFee = 5_120_000n;
    const f = controlledSource();
    const result = await planner(f.source, {maximumFeeZat: conventionalFee}).plan(
      eventId, TransactionType.payment,
      splitOrder(BigInt(live.positive.amountZat) - conventionalFee, 1024), []);
    assert.equal(result.transaction.getIntent().feeZat, conventionalFee);
    assert.equal(result.transaction.getDigest().zip317_conventional_fee_zat, Number(conventionalFee));
  });
});

test('impossible confirmation counts remain evidence contradictions', async () => {
  const f = controlledSource(state => {
    const txout = clone(state.txouts.get(`${LIVE_TXID}.${LIVE_INDEX}`)) as any;
    txout.confirmations = live.positive.tipHeight + 2;
    state.txouts.set(`${LIVE_TXID}.${LIVE_INDEX}`, txout);
  });
  await assert.rejects(planner(f.source).plan(eventId, TransactionType.payment, order(), []),
    (error: unknown) => error instanceof ZcashPaymentEvidenceError && error.code === 'confirmations');
});

test('a fee-capped candidate does not block a later exact no-change candidate', async () => {
  const f = controlledSource(state => {
    state.rows = [liveRow({txid: FAKE_A, satoshis: 60_000_000}), liveRow()];
    state.txouts.set(`${FAKE_A}.${LIVE_INDEX}`, new Error('capped candidate must not reach evidence'));
  });
  const payment = splitOrder(59_975_000n, 3);
  const result = await planner(f.source, {maximumFeeZat: 15_000n}).plan(
    eventId, TransactionType.payment, payment, []);
  assert.equal(result.transaction.getIntent().input.txid, LIVE_TXID);
  assert.equal(result.transaction.getIntent().feeZat, 15_000n);
  assert.equal(f.calls.includes(`txout:${FAKE_A}.${LIVE_INDEX}`), false);
});

test('zero change is allowed and a bounded sub-minimum remainder may be consumed as fee', async () => {
  const exact = controlledSource();
  const exactOrder = order(BigInt(live.positive.amountZat) - 10_000n);
  const result = await planner(exact.source, {minimumOutputZat: 100n}).plan(
    eventId, TransactionType.payment, exactOrder, []);
  assert.equal(result.transaction.getIntent().input.amountZat - result.transaction.getIntent().feeZat -
    result.transaction.getIntent().payments[0].assets.nativeToken, 0n);
  const dust = controlledSource();
  const consumed = await planner(dust.source, {minimumOutputZat: 101n}).plan(
    eventId, TransactionType.payment, order(BigInt(live.positive.amountZat) - 10_100n), []);
  assert.equal(consumed.transaction.getIntent().feeZat, 10_100n);
  assert.equal(consumed.transaction.getIntent().input.amountZat - consumed.transaction.getIntent().feeZat -
    consumed.transaction.getIntent().payments[0].assets.nativeToken, 0n);
  const capped = controlledSource();
  await assert.rejects(planner(capped.source, {minimumOutputZat: 101n, maximumFeeZat: 10_000n}).plan(
    eventId, TransactionType.payment, order(BigInt(live.positive.amountZat) - 10_100n), []),
  (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'fee_cap');
  const paymentDust = controlledSource();
  await assert.rejects(planner(paymentDust.source, {minimumOutputZat: 101n}).plan(
    eventId, TransactionType.payment, order(100n), []),
  (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'payments');
  assert.deepEqual(paymentDust.calls, []);
});

test('snapshot expiry during evidence checking aborts the attempt and never returns a stale plan', async () => {
  let clock = 0;
  const f = controlledSource(state => { state.clockOnTxOut = () => { clock = 10; }; });
  await assert.rejects(
    planner(f.source, {maxAgeMs: 10, now: () => clock}).plan(eventId, TransactionType.payment, order(), []),
    (error: unknown) => error instanceof ZcashUtxoSnapshotError && error.code === 'expired',
  );
});

test('a separately coherent newer evidence tip cannot be joined to the captured discovery snapshot', async () => {
  const f = controlledSource();
  const oldInfo = f.source.getBlockchainInfo;
  const newerTip = 'aa'.repeat(32);
  let calls = 0;
  f.source.getBlockchainInfo = async () => {
    if (calls++ < 2) return oldInfo();
    return {...clone(f.state.info), blocks: live.positive.tipHeight + 1, bestblockhash: newerTip};
  };
  const txout = clone(f.state.txouts.get(`${LIVE_TXID}.${LIVE_INDEX}`)) as any;
  txout.bestblock = newerTip; txout.confirmations = 2;
  f.state.txouts.set(`${LIVE_TXID}.${LIVE_INDEX}`, txout);
  const previous = clone(f.state.transactions.get(LIVE_TXID)) as any;
  previous.confirmations = 2; f.state.transactions.set(LIVE_TXID, previous);
  await assert.rejects(
    planner(f.source).plan(eventId, TransactionType.payment, order(), []),
    (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'snapshot_join',
  );
});

test('discovery creation height must equal the independently derived evidence height', async () => {
  const f = controlledSource(state => { state.rows = [liveRow({height: live.positive.tipHeight - 1})]; });
  await assert.rejects(
    planner(f.source).plan(eventId, TransactionType.payment, order(), []),
    (error: unknown) => error instanceof ZcashPaymentPlannerError && error.code === 'prevout_height_join',
  );
});

test('payment order and forbidden inputs are copied before the first source await', async () => {
  let release!: (value: unknown) => void;
  const f = controlledSource();
  const originalGenesis = f.source.getGenesisHash;
  let first = true;
  f.source.getGenesisHash = async () => first
    ? (first = false, await new Promise(resolve => { release = resolve; }))
    : originalGenesis();
  const requested = order(); const forbidden: string[] = [];
  const pending = planner(f.source).plan(eventId, TransactionType.payment, requested, forbidden);
  requested[0].assets.nativeToken = 1n;
  forbidden.push(`${LIVE_TXID}.${LIVE_INDEX}`);
  release(observed('getGenesisHash'));
  const result = await pending;
  assert.equal(result.transaction.extractPaymentOrder()[0].assets.nativeToken, 10_000_000n);
});
