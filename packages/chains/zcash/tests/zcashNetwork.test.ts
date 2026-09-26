import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {NativeZcashInspector} from '@rosen-bridge/rosen-extractor';
import type {ZcashSourcePolicy} from '@rosen-chains/zcash-payment';
import {
  ZcashNetwork,
  ZcashNetworkError,
  type ZcashChainSource,
} from '../lib/zcashNetwork.js';

function required(name: string): string {
  const value = process.env[name];
  assert.ok(value, `${name} is required`);
  return value;
}
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8')) as T;
}
function clone<T>(value: T): T { return structuredClone(value); }

interface Observation {method: string; result: unknown}
interface LiveFixture {
  policy: ZcashSourcePolicy;
  positive: {
    tipHash: string; tipHeight: number; candidateBranchId: string; outpoint: string;
    amountZat: string; scriptPubKeyHex: string;
  };
  unsignedTxHex: string;
  observations: Observation[];
}
interface DeliveredBlock {transactions: Array<Record<string, unknown>>}

const live = fixture<LiveFixture>('payment-planner-live-evidence.json');
const delivered = fixture<DeliveredBlock>('payment-planner-block-106.json');
const [PREV_TXID, PREV_INDEX_TEXT] = live.positive.outpoint.split(':');
const PREV_INDEX = Number(PREV_INDEX_TEXT);
const TIP = live.positive.tipHash;
const PARENT = '44'.repeat(32);
const ADDRESS = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const inspector = new NativeZcashInspector({
  executablePath: required('ZCASH_INSPECTOR_BIN'),
  expectedSha256: required('ZCASH_INSPECTOR_SHA256'),
});
const retainedConfirmed = observedLater<Record<string, unknown>>('getTransaction');
const mempoolInspection = inspector.inspect(
  retainedConfirmed.hex as string,
  live.positive.candidateBranchId,
);

function alternateAuthorizationHex(): string {
  const signedHex = retainedConfirmed.hex as string;
  const script = mempoolInspection.transparent.inputs[0].script_sig_hex;
  assert.ok(script.length >= 2 && signedHex.includes(script));
  const replacement = (script.startsWith('00') ? '01' : '00') + script.slice(2);
  const alternate = signedHex.replace(script, replacement);
  assert.notEqual(alternate, signedHex);
  assert.equal(
    inspector.inspect(alternate, live.positive.candidateBranchId).txid,
    mempoolInspection.txid,
    'ZIP-244 v5 txid must exclude transparent authorization bytes',
  );
  return alternate;
}

function observedLater<T>(method: string): T {
  const item = live.observations.find(value => value.method === method);
  assert.ok(item, `missing retained ${method} observation`);
  return clone(item.result) as T;
}

function observed(method: string): unknown {
  const item = live.observations.find(value => value.method === method);
  assert.ok(item, `missing retained ${method} observation`);
  return clone(item.result);
}
function confirmedTransaction(): Record<string, unknown> {
  return observed('getTransaction') as Record<string, unknown>;
}
function mempoolTransaction(): Record<string, unknown> {
  return {
    txid: mempoolInspection.txid,
    hex: retainedConfirmed.hex,
    size: retainedConfirmed.size,
    in_active_chain: false,
  };
}
function coinbaseTransaction(): Record<string, unknown> {
  const tx = delivered.transactions.find(value => {
    const vin = value.vin;
    return Array.isArray(vin) && vin.some(input =>
      input !== null && typeof input === 'object' && 'coinbase' in input);
  });
  assert.ok(tx);
  return {txid: tx.txid, hex: tx.hex, size: tx.size};
}

interface State {
  genesis: unknown;
  info: unknown;
  addressUtxos: unknown;
  txout: unknown;
  confirmed: unknown;
  unbound: unknown;
  block: unknown;
  mempoolBefore: unknown;
  mempoolAfter: unknown;
  submitResult: unknown;
}
function controlled(change: (state: State) => void = () => undefined): {
  source: ZcashChainSource; state: State; calls: string[];
} {
  const confirmed = confirmedTransaction();
  const state: State = {
    genesis: observed('getGenesisHash'),
    info: observed('getBlockchainInfo'),
    // Controlled discovery row derived from the retained, native-checked vout; no live discovery claim.
    addressUtxos: {utxos: [{address: ADDRESS, txid: PREV_TXID, outputIndex: PREV_INDEX,
      script: live.positive.scriptPubKeyHex, satoshis: Number(live.positive.amountZat),
      height: live.positive.tipHeight}], hash: TIP, height: live.positive.tipHeight},
    txout: observed('getTxOut'),
    confirmed,
    unbound: confirmed,
    block: {
      hash: TIP, previousblockhash: PARENT, height: live.positive.tipHeight,
      // The full block envelope is controlled because the retained receipt did not keep block 107.
      confirmations: 1, nTx: 2, tx: ['11'.repeat(32), PREV_TXID],
    },
    mempoolBefore: {}, mempoolAfter: {}, submitResult: mempoolInspection.txid,
  };
  change(state);
  const calls: string[] = [];
  let mempoolReads = 0;
  const response = async (label: string, value: unknown): Promise<unknown> => {
    calls.push(label);
    if (value instanceof Error) throw value;
    return clone(value);
  };
  const source: ZcashChainSource = {
    getGenesisHash: () => response('genesis', state.genesis),
    getBlockchainInfo: () => response('info', state.info),
    getAddressUtxos: address => response(`utxos:${address}`, state.addressUtxos),
    getTxOut: (txid, index) => response(`txout:${txid}.${index}`, state.txout),
    getBlockHash: height => response(`blockhash:${height}`, height === live.positive.tipHeight ? TIP : PARENT),
    getTransaction: (txid, block) => response(`transaction:${txid}:${block}`, state.confirmed),
    getBlock: block => response(`block:${block}`, state.block),
    getUnboundTransaction: txid => response(`unbound:${txid}`, state.unbound),
    getMempoolEntries: () => response('mempool', mempoolReads++ === 0 ? state.mempoolBefore : state.mempoolAfter),
    sendRawTransaction: raw => response(`submit:${raw.length}`, state.submitResult),
  };
  return {source, state, calls};
}
function network(source: ZcashChainSource, overrides: Partial<{
  maxUtxos: number; maxAgeMs: number; now: () => number; maxMempoolTransactions: number;
}> = {}): ZcashNetwork {
  return new ZcashNetwork({source, policy: clone(live.policy), inspector, ...overrides});
}
function fails(code: string): (error: unknown) => boolean {
  return error => error instanceof ZcashNetworkError && error.code === code;
}

test('confirmed transaction and both block reads retain independent identity joins', async () => {
  const f = controlled();
  const n = network(f.source);
  const tx = await n.getTransaction(PREV_TXID, TIP);
  assert.deepEqual(tx, {
    txid: PREV_TXID, hex: (f.state.confirmed as Record<string, unknown>).hex,
    size: (f.state.confirmed as Record<string, unknown>).size,
    blockhash: TIP, height: live.positive.tipHeight,
  });
  const ids = await n.getBlockTransactionIds(TIP);
  const info = await n.getBlockInfo(TIP);
  assert.equal(ids.includes(PREV_TXID), true);
  assert.deepEqual(info, {
    hash: TIP, parentHash: PARENT, height: live.positive.tipHeight,
    transactionCount: 2, transactionIds: ids,
  });
  assert.equal(f.calls.filter(call => call === `block:${TIP}`).length, 2);
});

test('confirmed transaction request identity and native raw identity fail independently', async t => {
  await t.test('requested id', async () => {
    const f = controlled();
    await assert.rejects(network(f.source).getTransaction('55'.repeat(32), TIP), fails('identity'));
  });
  await t.test('raw txid', async () => {
    const f = controlled(state => {
      (state.confirmed as Record<string, unknown>).hex = live.unsignedTxHex;
      (state.confirmed as Record<string, unknown>).size = live.unsignedTxHex.length / 2;
    });
    await assert.rejects(network(f.source).getTransaction(PREV_TXID, TIP), fails('identity'));
  });
});

test('confirmed transaction requires active-chain confirmation fields under a stable context', async t => {
  for (const [name, change] of [
    ['inactive', (tx: Record<string, unknown>) => { tx.in_active_chain = false; }],
    ['zero confirmations', (tx: Record<string, unknown>) => { tx.confirmations = 0; }],
  ] as const) {
    await t.test(name, async () => {
      const f = controlled(state => { change(state.confirmed as Record<string, unknown>); });
      await assert.rejects(network(f.source).getTransaction(PREV_TXID, TIP), fails('confirmation'));
    });
  }
});

test('raw block requires mandatory nTx to match the complete transaction-id list', async t => {
  for (const [name, value] of [['missing', undefined], ['mismatch', 3]] as const) {
    await t.test(name, async () => {
      const f = controlled(state => {
        if (value === undefined) delete (state.block as Record<string, unknown>).nTx;
        else (state.block as Record<string, unknown>).nTx = value;
      });
      await assert.rejects(network(f.source).getBlockInfo(TIP), fails('block'));
    });
  }
});

test('mempool transactions have no invented block metadata and expose every consumed input', async () => {
  const mempool = mempoolTransaction();
  const f = controlled(state => {
    state.unbound = mempool;
    state.mempoolBefore = {[mempoolInspection.txid]: {size: mempool.size, fee: 0.0001}};
    state.mempoolAfter = clone(state.mempoolBefore);
  });
  const [tx] = await network(f.source).getMempoolTransactions();
  assert.deepEqual(tx, {
    txid: mempoolInspection.txid, hex: retainedConfirmed.hex, size: retainedConfirmed.size,
    consumedBoxIds: mempoolInspection.transparent.inputs.map(input => `${input.prevout_txid}.${input.prevout_index}`),
  });
  assert.equal(Object.hasOwn(tx, 'blockhash'), false);
  assert.equal(Object.hasOwn(tx, 'height'), false);
  assert.equal(f.calls.filter(call => call === 'mempool').length, 2);
});

test('mempool disappearance, confirmation race, changed membership and bounds fail closed', async t => {
  const id = mempoolInspection.txid;
  for (const [name, change, code] of [
    ['missing raw', (s: State) => { s.unbound = null; s.mempoolBefore = {[id]: {}}; s.mempoolAfter = {[id]: {}}; }, 'mempool'],
    ['confirmed race', (s: State) => { s.unbound = confirmedTransaction(); s.mempoolBefore = {[PREV_TXID]: {}}; s.mempoolAfter = {[PREV_TXID]: {}}; }, 'mempool'],
    ['changed set', (s: State) => { s.unbound = mempoolTransaction(); s.mempoolBefore = {[id]: {}}; s.mempoolAfter = {}; }, 'mempool'],
  ] as const) {
    await t.test(name, async () => {
      const f = controlled(change);
      await assert.rejects(network(f.source).getMempoolTransactions(), fails(code));
    });
  }
  const bounded = controlled(state => { state.mempoolBefore = {[id]: {}, ['66'.repeat(32)]: {}}; });
  await assert.rejects(network(bounded.source, {maxMempoolTransactions: 1}).getMempoolTransactions(), fails('mempool_size'));
});

test('mempool classification rejects confirmed-only metadata and coinbase bytes', async t => {
  for (const [name, change] of [
    ['confirmations', (tx: Record<string, unknown>) => { tx.confirmations = 5; }],
    ['missing active-chain flag', (tx: Record<string, unknown>) => { delete tx.in_active_chain; }],
    ['active-chain true', (tx: Record<string, unknown>) => { tx.in_active_chain = true; }],
    ['active-chain string', (tx: Record<string, unknown>) => { tx.in_active_chain = 'false'; }],
  ] as const) {
    await t.test(name, async () => {
      const f = controlled(state => {
        const tx = mempoolTransaction(); change(tx); state.unbound = tx;
        state.mempoolBefore = {[mempoolInspection.txid]: {}};
      });
      await assert.rejects(network(f.source).getTxConfirmation(mempoolInspection.txid), fails('mempool'));
    });
  }
  const coinbase = coinbaseTransaction();
  const f = controlled(state => {
    state.unbound = {...coinbase, in_active_chain: false};
    state.mempoolBefore = {[coinbase.txid as string]: {}};
  });
  await assert.rejects(network(f.source).getTxConfirmation(coinbase.txid as string), fails('identity'));
});

test('confirmation status distinguishes missing, actual mempool, and active confirmed membership', async () => {
  const missing = controlled(state => { state.unbound = null; });
  assert.equal(await network(missing.source).getTxConfirmation(PREV_TXID), -1);

  const mempool = controlled(state => {
    state.unbound = mempoolTransaction();
    state.mempoolBefore = {[mempoolInspection.txid]: {}};
  });
  assert.equal(await network(mempool.source).getTxConfirmation(mempoolInspection.txid), 0);

  const confirmed = controlled();
  assert.equal(await network(confirmed.source).getTxConfirmation(PREV_TXID), 1);
});

test('signed transaction observation returns exact frozen absent, mempool, and confirmed evidence', async () => {
  const signedHex = retainedConfirmed.hex as string;
  const missing = controlled(state => { state.unbound = null; });
  const absent = await network(missing.source).observeSignedTransaction(PREV_TXID, signedHex);
  assert.deepEqual(absent, {kind: 'absent'});
  assert.equal(Object.isFrozen(absent), true);
  assert.equal(missing.calls.includes('mempool'), true);

  const mempool = controlled(state => {
    state.unbound = mempoolTransaction();
    state.mempoolBefore = {[mempoolInspection.txid]: {}};
  });
  const pending = await network(mempool.source).observeSignedTransaction(
    mempoolInspection.txid,
    signedHex,
  );
  assert.deepEqual(pending, {kind: 'mempool', txId: mempoolInspection.txid, hex: signedHex});
  assert.equal(Object.isFrozen(pending), true);

  const confirmed = controlled();
  const mined = await network(confirmed.source).observeSignedTransaction(PREV_TXID, signedHex);
  assert.deepEqual(mined, {
    kind: 'confirmed',
    txId: PREV_TXID,
    hex: signedHex,
    blockHash: TIP,
    height: live.positive.tipHeight,
    confirmations: 1,
  });
  assert.equal(Object.isFrozen(mined), true);
});

test('null transaction evidence is not absence when the active mempool contradicts or is malformed', async t => {
  await t.test('txid is present', async () => {
    const f = controlled(state => {
      state.unbound = null;
      state.mempoolBefore = {[PREV_TXID]: {}};
    });
    await assert.rejects(
      network(f.source).observeSignedTransaction(PREV_TXID, retainedConfirmed.hex as string),
      fails('mempool'),
    );
  });
  await t.test('mempool is malformed', async () => {
    const f = controlled(state => {
      state.unbound = null;
      state.mempoolBefore = [];
    });
    await assert.rejects(
      network(f.source).observeSignedTransaction(PREV_TXID, retainedConfirmed.hex as string),
      fails('mempool'),
    );
  });
});

test('observation rejects different authorization bytes even when ZIP-244 txid is unchanged', async () => {
  const signedHex = retainedConfirmed.hex as string;
  const alternate = alternateAuthorizationHex();
  const f = controlled(state => {
    state.unbound = mempoolTransaction();
    state.mempoolBefore = {[mempoolInspection.txid]: {}};
  });
  await assert.rejects(
    network(f.source).observeSignedTransaction(mempoolInspection.txid, alternate),
    fails('identity'),
  );
  assert.notEqual(alternate, signedHex);
});

test('confirmation does not accept absent mempool membership or contradictory active block data', async t => {
  await t.test('mempool membership', async () => {
    const f = controlled(state => { state.unbound = mempoolTransaction(); });
    await assert.rejects(network(f.source).getTxConfirmation(mempoolInspection.txid), fails('mempool'));
  });
  await t.test('block membership', async () => {
    const f = controlled(state => {
      (state.block as Record<string, unknown>).tx = ['77'.repeat(32)];
      (state.block as Record<string, unknown>).nTx = 1;
    });
    await assert.rejects(network(f.source).getTxConfirmation(PREV_TXID), fails('identity'));
  });
});

test('address paging owns a fresh snapshot per call and concurrent calls share no mutable page state', async () => {
  const f = controlled();
  const n = network(f.source);
  const [left, right] = await Promise.all([
    n.getAddressBoxes(ADDRESS, 0, 1), n.getAddressBoxes(ADDRESS, 0, 1),
  ]);
  assert.deepEqual(left, right);
  assert.notEqual(left, right);
  assert.equal(f.calls.filter(call => call === `utxos:${ADDRESS}`).length, 2);
  const assets = await n.getAddressAssets(ADDRESS);
  assert.deepEqual(assets, {nativeToken: BigInt(live.positive.amountZat), tokens: []});
});

test('box validity treats missing and intentional spend-ineligible outputs as false', async t => {
  const id = `${PREV_TXID}.${PREV_INDEX}`;
  const found = controlled();
  assert.equal(await network(found.source).isBoxUnspentAndValid(id), true);
  const missing = controlled(state => { state.txout = null; });
  assert.equal(await network(missing.source).isBoxUnspentAndValid(id), false);
  for (const [name, change] of [
    ['coinbase', (output: Record<string, unknown>) => { output.coinbase = true; }],
    ['unconfirmed', (output: Record<string, unknown>) => { output.confirmations = 0; }],
    ['zero amount', (output: Record<string, unknown>) => { output.value = '0'; }],
    ['unsupported script', (output: Record<string, unknown>) => {
      output.scriptPubKey = {hex: 'a914' + '22'.repeat(20) + '87'};
    }],
  ] as const) {
    await t.test(name, async () => {
      const item = controlled(state => { change(state.txout as Record<string, unknown>); });
      assert.equal(await network(item.source).isBoxUnspentAndValid(id), false);
    });
  }
});

test('box ineligibility cannot mask malformed amount or script evidence', async t => {
  await t.test('coinbase with malformed amount', async () => {
    const f = controlled(state => {
      const output = state.txout as Record<string, unknown>;
      output.coinbase = true; output.value = 'bad';
    });
    await assert.rejects(network(f.source).isBoxUnspentAndValid(`${PREV_TXID}.${PREV_INDEX}`), fails('box'));
  });
  await t.test('low confirmations with malformed script', async () => {
    const f = controlled(state => {
      const output = state.txout as Record<string, unknown>;
      output.confirmations = 0; output.scriptPubKey = {hex: 'not-hex'};
    });
    await assert.rejects(network(f.source).isBoxUnspentAndValid(`${PREV_TXID}.${PREV_INDEX}`), fails('box'));
  });
});

test('box validity rejects malformed and contradictory context responses', async () => {
  const id = `${PREV_TXID}.${PREV_INDEX}`;
  const found = controlled();
  const malformed = controlled(state => { (state.txout as Record<string, unknown>).bestblock = '88'.repeat(32); });
  await assert.rejects(network(malformed.source).isBoxUnspentAndValid(id), fails('context'));
  await assert.rejects(network(found.source).isBoxUnspentAndValid('bad'), fails('box_id'));
});

test('submission accepts signed transparent v5 bytes and requires the returned txid', async () => {
  const ok = controlled();
  await network(ok.source).submitTransaction(retainedConfirmed.hex as string, {
    async authorize() { ok.calls.push('authorize'); },
    assertCurrent() { ok.calls.push('assertCurrent'); },
  });
  assert.equal(ok.calls.some(call => call.startsWith('submit:')), true);
  const submitIndex = ok.calls.findIndex(call => call.startsWith('submit:'));
  assert.deepEqual(ok.calls.slice(submitIndex - 2, submitIndex), ['authorize', 'assertCurrent']);
  const wrong = controlled(state => { state.submitResult = '99'.repeat(32); });
  await assert.rejects(network(wrong.source).submitTransaction(retainedConfirmed.hex as string), fails('identity'));
  const blocked = controlled();
  let current = true;
  await assert.rejects(
    network(blocked.source).submitTransaction(retainedConfirmed.hex as string, {
      async authorize() {
        blocked.calls.push('authorize');
        queueMicrotask(() => { current = false; });
      },
      assertCurrent() {
        blocked.calls.push('assertCurrent');
        if (!current) throw new Error('policy changed');
      },
    }),
    /policy changed/,
  );
  assert.deepEqual(blocked.calls.slice(-2), ['authorize', 'assertCurrent']);
  assert.equal(blocked.calls.some(call => call.startsWith('submit:')), false);
});

test('submission captures both guard methods before authorization can yield to caller mutation', async () => {
  const f = controlled();
  let releaseAuthorization!: () => void;
  let authorizationEntered!: () => void;
  const entered = new Promise<void>((resolve) => { authorizationEntered = resolve; });
  let current = true;
  const guard = {
    async authorize(): Promise<void> {
      f.calls.push('authorize');
      authorizationEntered();
      await new Promise<void>((resolve) => { releaseAuthorization = resolve; });
    },
    assertCurrent(): void {
      f.calls.push('capturedAssertCurrent');
      if (!current) throw new Error('captured policy changed');
    },
  };
  const pending = network(f.source).submitTransaction(
    retainedConfirmed.hex as string,
    guard,
  );
  await entered;
  current = false;
  guard.assertCurrent = () => { f.calls.push('replacementAssertCurrent'); };
  releaseAuthorization();
  await assert.rejects(pending, /captured policy changed/);
  assert.equal(f.calls.includes('capturedAssertCurrent'), true);
  assert.equal(f.calls.includes('replacementAssertCurrent'), false);
  assert.equal(f.calls.some(call => call.startsWith('submit:')), false);
});

test('submission rejects unsigned, expired and unsupported native candidates before RPC', async t => {
  await t.test('unsigned', async () => {
    const f = controlled();
    await assert.rejects(network(f.source).submitTransaction(live.unsignedTxHex), fails('transaction'));
    assert.equal(f.calls.some(call => call.startsWith('submit:')), false);
  });
  await t.test('expired', async () => {
    const f = controlled(state => {
      state.info = {...state.info as Record<string, unknown>, blocks: 306,
        bestblockhash: '77'.repeat(32)};
    });
    await assert.rejects(network(f.source).submitTransaction(retainedConfirmed.hex as string), fails('expiry'));
    assert.equal(f.calls.some(call => call.startsWith('submit:')), false);
  });
  await t.test('version and shielded shape', async () => {
    for (const inspectionChange of [
      {version: {...mempoolInspection.version, kind: 'v4' as const, number: 4}},
      {fully_transparent: false},
    ]) {
      const f = controlled();
      const changedInspector = {inspect(raw: string, branch: string) {
        return {...inspector.inspect(raw, branch), ...inspectionChange};
      }};
      await assert.rejects(new ZcashNetwork({source: f.source, policy: clone(live.policy),
        inspector: changedInspector}).submitTransaction(retainedConfirmed.hex as string), fails('transaction'));
      assert.equal(f.calls.some(call => call.startsWith('submit:')), false);
    }
  });
});

test('configuration rejects a sparse branch schedule before any network read', () => {
  const f = controlled();
  const branches: Array<{height: number; branchId: string}> = new Array(2);
  branches[0] = live.policy.branches[0];
  const sparse = {...clone(live.policy), branches};
  assert.throws(() => new ZcashNetwork({source: f.source, policy: sparse, inspector}), fails('configuration'));
  assert.deepEqual(f.calls, []);
});

test('native token details and identity mapping preserve eight-decimal zatoshi units', async () => {
  const n = network(controlled().source);
  assert.deepEqual(await n.getTokenDetail('zec'), {tokenId: 'zec', name: 'Zcash', decimals: 8});
  await assert.rejects(n.getTokenDetail('other'), fails('token'));
  assert.equal(await n.getActualTxId(PREV_TXID), PREV_TXID);
});
