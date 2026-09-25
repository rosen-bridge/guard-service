import assert from 'node:assert/strict';
import test from 'node:test';
import type {ZcashSourcePolicy} from '@rosen-chains/zcash-payment';
import {ZcashUtxoSnapshot, ZcashUtxoSnapshotError, type ZcashDiscoverySource} from '../lib/utxoSnapshot.js';

const address = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const script = '76a914f09ce3435526cda8bffce9b09336d23ec5cc7c9188ac';
const tip = 'aa'.repeat(32), genesis = 'bb'.repeat(32), branch = 'c2d6d0b4';
function policy(): ZcashSourcePolicy {
  return {network: 'regtest', genesisHash: genesis, sourceId: 'snapshot-test',
    branches: [{height: 0, branchId: branch}], minimumConfirmations: 1, maximumExpiryDelta: 200};
}
function info() { return {chain: 'test', blocks: 107, bestblockhash: tip,
  consensus: {chaintip: branch, nextblock: branch}}; }
function row(n = 1) { return {address, txid: n.toString(16).padStart(64, '0'), outputIndex: 0,
  script, satoshis: 59_990_000, height: 106}; }
function fixture() {
  const data = {utxos: [row(1), row(2), row(3)], hash: tip, height: 107};
  const calls: string[] = [];
  const source: ZcashDiscoverySource = {
    async getGenesisHash() { calls.push('genesis'); return genesis; },
    async getBlockchainInfo() { calls.push('info'); return info(); },
    async getAddressUtxos(given) { calls.push('utxos'); assert.equal(given, address); return data; },
    async getBlockHash() { throw new Error('not part of discovery'); },
    async getTxOut() { throw new Error('not part of discovery'); },
    async getTransaction() { throw new Error('not part of discovery'); },
  };
  return {data, calls, source};
}
const fails = (code: string) => (error: unknown) => error instanceof ZcashUtxoSnapshotError && error.code === code;

test('capture binds a full list and pages stay stable after source mutation', async () => {
  const f = fixture();
  const snapshot = await ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address});
  assert.equal(snapshot.address, address); assert.equal(snapshot.network, 'regtest');
  assert.equal(snapshot.genesisHash, genesis); assert.equal(snapshot.tipHash, tip);
  assert.equal(snapshot.tipHeight, 107); assert.equal(snapshot.nextBranchId, branch);
  assert.deepEqual(f.calls, ['genesis', 'info', 'utxos', 'genesis', 'info']);
  const page = await snapshot.getAddressBoxes(address, 0, 1);
  assert.deepEqual(page, [{txId: row(1).txid, index: 0, value: 59_990_000n, scriptPubKeyHex: script, height: 106}]);
  f.data.utxos.shift(); f.data.utxos[0].satoshis = 1;
  (page[0] as {value: bigint}).value = 2n; page.length = 0;
  assert.equal((await snapshot.getAddressBoxes(address, 1, 1))[0].txId, row(2).txid);
  assert.equal((await snapshot.getAddressBoxes(address, 0, 1))[0].value, 59_990_000n);
  assert.deepEqual(await snapshot.getAddressBoxes(address, 3, 10), []);
  assert.equal(f.calls.length, 5);
});

test('concurrent selection attempts keep their own independently captured list', async () => {
  const f = fixture(); let next = 0;
  f.source.getAddressUtxos = async () => ({...f.data, utxos: next++ ? [row(9)] : [row(1)]});
  const [left, right] = await Promise.all([0, 1].map(() => ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address})));
  assert.equal((await left.getAddressBoxes(address, 0, 1))[0].txId, row(1).txid);
  assert.equal((await right.getAddressBoxes(address, 0, 1))[0].txId, row(9).txid);
});

test('empty list, exact row bound and exact maximum integer value remain representable', async () => {
  const f = fixture(); f.data.utxos = [];
  const empty = await ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address, maxUtxos: 1});
  assert.deepEqual(await empty.getAddressBoxes(address, 0, 1), []);
  f.data.utxos = [{...row(), satoshis: 2_100_000_000_000_000}];
  const maximum = await ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address, maxUtxos: 1});
  assert.equal((await maximum.getAddressBoxes(address, 0, 1))[0].value, 2_100_000_000_000_000n);
  f.data.utxos[0].satoshis = 0;
  const zero = await ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address});
  assert.equal((await zero.getAddressBoxes(address, 0, 1))[0].value, 0n);
});

test('invalid full-list evidence is rejected even beyond the requested first page', async t => {
  const cases: Array<[string, string, (data: any) => void]> = [
    ['oversize', 'list_size', d => d.utxos.push(row(4))],
    ['duplicate', 'duplicate', d => d.utxos[2] = {...row(1), satoshis: 1}],
    ['sparse row', 'shape', d => delete d.utxos[2]],
    ['array row', 'shape', d => d.utxos[2] = []],
    ['null row', 'shape', d => d.utxos[2] = null],
    ['absent txid', 'shape', d => delete d.utxos[2].txid],
    ['absent index', 'shape', d => delete d.utxos[2].outputIndex],
    ['absent amount', 'shape', d => delete d.utxos[2].satoshis],
    ['absent address', 'shape', d => delete d.utxos[2].address],
    ['absent script', 'shape', d => delete d.utxos[2].script],
    ['absent row height', 'shape', d => delete d.utxos[2].height],
    ['uppercase txid', 'hex', d => d.utxos[2].txid = 'AB'.repeat(32)],
    ['short txid', 'hex', d => d.utxos[2].txid = '01'],
    ['fractional index', 'integer', d => d.utxos[2].outputIndex = 0.5],
    ['negative index', 'integer', d => d.utxos[2].outputIndex = -1],
    ['oversize index', 'integer', d => d.utxos[2].outputIndex = 0x100000000],
    ['string amount', 'integer', d => d.utxos[2].satoshis = '1'],
    ['fractional amount', 'integer', d => d.utxos[2].satoshis = 0.5],
    ['negative amount', 'integer', d => d.utxos[2].satoshis = -1],
    ['negative zero', 'integer', d => d.utxos[2].satoshis = -0],
    ['unsafe amount', 'integer', d => d.utxos[2].satoshis = Number.MAX_SAFE_INTEGER + 1],
    ['amount ceiling', 'integer', d => d.utxos[2].satoshis = 2_100_000_000_000_001],
    ['wrong address', 'output_join', d => d.utxos[2].address = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs'],
    ['wrong script', 'output_join', d => d.utxos[2].script = '51'],
    ['future height', 'integer', d => d.utxos[2].height = 108],
    ['height order', 'order', d => d.utxos[2].height = 105],
    ['string height', 'integer', d => d.utxos[2].height = '106'],
    ['wrong tip hash', 'context', d => d.hash = 'cc'.repeat(32)],
    ['wrong tip height', 'context', d => d.height = 106],
    ['no hash', 'shape', d => delete d.hash],
    ['no context height', 'shape', d => delete d.height],
    ['no list', 'shape', d => delete d.utxos],
    ['array-like list', 'shape', d => d.utxos = {0: row(), length: 1}],
  ];
  for (const [name, code, mutate] of cases) await t.test(name, async () => {
    const f = fixture(); mutate(f.data);
    await assert.rejects(ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address, maxUtxos: 3}), fails(code));
  });
});

test('context, operational errors and malformed response remain explicit failures', async t => {
  for (const [name, code, alter] of [
    ['genesis', 'genesis', (f: ReturnType<typeof fixture>) => {f.source.getGenesisHash = async () => 'cc'.repeat(32);}],
    ['network', 'network', (f: ReturnType<typeof fixture>) => {f.source.getBlockchainInfo = async () => ({...info(), chain: 'main'});}],
    ['tip branch', 'branch', (f: ReturnType<typeof fixture>) => {f.source.getBlockchainInfo = async () => ({...info(), consensus: {...info().consensus, chaintip: '00000000'}});}],
    ['next branch', 'branch', (f: ReturnType<typeof fixture>) => {f.source.getBlockchainInfo = async () => ({...info(), consensus: {...info().consensus, nextblock: '00000000'}});}],
    ['same-height reorg', 'context', (f: ReturnType<typeof fixture>) => {let n=0; f.source.getBlockchainInfo = async () => ({...info(), bestblockhash: n++ ? 'cc'.repeat(32) : tip});}],
    ['height change', 'context', (f: ReturnType<typeof fixture>) => {let n=0; f.source.getBlockchainInfo = async () => ({...info(), blocks: n++ ? 108 : 107});}],
    ['final genesis', 'genesis', (f: ReturnType<typeof fixture>) => {let n=0; f.source.getGenesisHash = async () => n++ ? 'cc'.repeat(32) : genesis;}],
    ['source outage', 'source', (f: ReturnType<typeof fixture>) => {f.source.getAddressUtxos = async () => {throw new Error('private source message');};}],
    ['null response', 'shape', (f: ReturnType<typeof fixture>) => {f.source.getAddressUtxos = async () => null;}],
    ['array response', 'shape', (f: ReturnType<typeof fixture>) => {f.source.getAddressUtxos = async () => [];}],
    ['missing consensus', 'shape', (f: ReturnType<typeof fixture>) => {f.source.getBlockchainInfo = async () => ({chain: 'test', blocks: 107, bestblockhash: tip});}],
    ['fractional tip', 'integer', (f: ReturnType<typeof fixture>) => {f.source.getBlockchainInfo = async () => ({...info(), blocks: 107.5});}],
  ] as const) await t.test(name, async () => {
    const f = fixture(); alter(f);
    await assert.rejects(ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address}), fails(code));
  });
});

test('configured next-height activation is distinct from the current block branch', async () => {
  const f = fixture(), p = policy();
  p.branches = [{height: 0, branchId: '00000000'}, {height: 108, branchId: branch}];
  f.source.getBlockchainInfo = async () => ({...info(), consensus: {chaintip: '00000000', nextblock: branch}});
  const snapshot = await ZcashUtxoSnapshot.capture({source: f.source, policy: p, address});
  assert.equal(snapshot.nextBranchId, branch);
  assert.throws(() => Object.defineProperty(snapshot, 'tipHash', {value: 'cc'.repeat(32)}), TypeError);
});

test('policy, method references and capture options are copied before the first await', async () => {
  const f = fixture(), p = policy(); let release!: (value: unknown) => void;
  let first = true;
  f.source.getGenesisHash = async () => first ? (first = false, await new Promise(resolve => { release = resolve; })) : genesis;
  const options = {source: f.source, policy: p, address, now: () => 10, maxAgeMs: 30};
  const pending = ZcashUtxoSnapshot.capture(options);
  p.network = 'mainnet'; p.genesisHash = 'cc'.repeat(32); p.branches[0].branchId = '00000000';
  options.address = 'invalid'; options.maxAgeMs = 1; options.now = () => 1_000_000;
  f.source.getBlockchainInfo = async () => {throw new Error('replaced');};
  f.source.getAddressUtxos = async () => {throw new Error('replaced');};
  f.source.getGenesisHash = async () => {throw new Error('replaced');};
  release(genesis);
  const snapshot = await pending;
  assert.equal(snapshot.network, 'regtest'); assert.equal(snapshot.address, address);
  assert.equal((await snapshot.getAddressBoxes(address, 0, 1))[0].txId, row(1).txid);
});

test('expiration includes capture time, exact deadline and backward clock latch the attempt', async () => {
  const f = fixture(); let time = 0;
  const options = {source: f.source, policy: policy(), address, now: () => time, maxAgeMs: 30};
  const snapshot = await ZcashUtxoSnapshot.capture(options);
  time = 29; snapshot.assertFresh(); time = 30;
  assert.throws(() => snapshot.assertFresh(), fails('expired'));
  time = 0; await assert.rejects(snapshot.getAddressBoxes(address, 0, 1), fails('expired'));
  const backward = await ZcashUtxoSnapshot.capture(options);
  time = 10; backward.assertFresh(); time = 9;
  assert.throws(() => backward.assertFresh(), fails('expired'));
  time = 11; assert.throws(() => backward.assertFresh(), fails('expired'));
  time = 0; f.source.getAddressUtxos = async () => {time = 30; return f.data;};
  await assert.rejects(ZcashUtxoSnapshot.capture(options), fails('expired'));
});

test('invalid configuration and addresses never reach the source; pages reject invalid arguments', async () => {
  const f = fixture();
  for (const extra of [{address: 'invalid'}, {maxUtxos: 0}, {maxUtxos: 100001}, {maxAgeMs: 0},
    {maxAgeMs: 300001}, {maxAgeMs: 0.5}, {now: () => NaN}]) {
    await assert.rejects(ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address, ...extra}), fails('configuration'));
  }
  assert.deepEqual(f.calls, []);
  for (const branches of [[], [{height: 1, branchId: branch}],
    [{height: 0, branchId: branch}, {height: 0, branchId: branch}]]) {
    await assert.rejects(ZcashUtxoSnapshot.capture({source: f.source, policy: {...policy(), branches}, address}), fails('configuration'));
  }
  assert.deepEqual(f.calls, []);
  const snapshot = await ZcashUtxoSnapshot.capture({source: f.source, policy: policy(), address});
  for (const [offset, limit] of [[-1,1],[0,0],[0,-1],[0.5,1],[0,0.5],[Number.MAX_SAFE_INTEGER+1,1]]) {
    await assert.rejects(snapshot.getAddressBoxes(address, offset, limit), fails('pagination'));
  }
  await assert.rejects(snapshot.getAddressBoxes('other', 0, 1), fails('address'));
});
