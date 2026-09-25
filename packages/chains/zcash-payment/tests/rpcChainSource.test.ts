import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import test, {type TestContext} from 'node:test';
import {ZcashRpcEvidenceSource, ZcashRpcEvidenceError} from '../lib/rpcEvidenceSource.js';

const txid = 'aa'.repeat(32), blockHash = 'bb'.repeat(32);
const missing = {code: -5, message: 'Transaction not found in mempool or best chain'};
const failure = (code: string) => (error: unknown) => error instanceof ZcashRpcEvidenceError &&
  error.code === code && error.message === `Zcash RPC evidence ${code} failure`;
interface Request {jsonrpc: string; id: number; method: string; params: unknown[]}
async function fixture(t: TestContext, respond: (request: Request) => unknown) {
  const calls: Request[] = [], sizes: number[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks); sizes.push(body.length);
    const parsed = JSON.parse(body.toString('utf8')) as Request;
    calls.push(parsed);
    response.setHeader('content-type', 'application/json');
    const result = respond(parsed);
    response.end(typeof result === 'string' ? result : JSON.stringify(result));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return {calls, sizes, source: new ZcashRpcEvidenceSource({rpcUrl: `http://127.0.0.1:${address.port}`})};
}

test('chain methods send exact bound read and submission arguments', async t => {
  const results: Record<string, unknown> = {
    getblock: {hash: blockHash, height: 107, tx: [txid]},
    getrawtransaction: {txid, hex: '00'},
    getrawmempool: {[txid]: {size: 134, fee: 0.0001}},
    sendrawtransaction: txid,
  };
  const f = await fixture(t, request => ({jsonrpc: '2.0', id: request.id, result: results[request.method]}));
  assert.deepEqual(await f.source.getBlock(blockHash), results.getblock);
  assert.deepEqual(await f.source.getUnboundTransaction(txid), results.getrawtransaction);
  assert.deepEqual(await f.source.getMempoolEntries(), results.getrawmempool);
  assert.equal(await f.source.sendRawTransaction('00'), txid);
  assert.deepEqual(f.calls.map(({method, params}) => ({method, params})), [
    {method: 'getblock', params: [blockHash, 1]},
    {method: 'getrawtransaction', params: [txid, 1]},
    {method: 'getrawmempool', params: [true]},
    {method: 'sendrawtransaction', params: ['00']},
  ]);
  assert.deepEqual(f.calls.map(call => call.id), [1, 2, 3, 4]);
});

test('only the pinned unbound-transaction missing error becomes null', async t => {
  let make = (request: Request): unknown => ({jsonrpc: '2.0', id: request.id, error: missing});
  const f = await fixture(t, request => make(request));
  assert.equal(await f.source.getUnboundTransaction(txid), null);
  make = request => ({jsonrpc: '2.0', id: request.id, result: null, error: missing});
  assert.equal(await f.source.getUnboundTransaction(txid), null);
  await assert.rejects(f.source.getTransaction(txid, blockHash), failure('rpc_error'));
  await assert.rejects(f.source.getBlock(blockHash), failure('rpc_error'));
  const cases: Array<[string, string, (request: Request) => unknown]> = [
    ['other code', 'rpc_error', r => ({id: r.id, error: {...missing, code: -8}})],
    ['numeric string code', 'rpc_error', r => ({id: r.id, error: {...missing, code: '-5'}})],
    ['other message', 'rpc_error', r => ({id: r.id, error: {...missing, message: 'txid not found'}})],
    ['appended message', 'rpc_error', r => ({id: r.id, error: {...missing, message: missing.message + ': unavailable'}})],
    ['message whitespace', 'rpc_error', r => ({id: r.id, error: {...missing, message: missing.message + ' '}})],
    ['null error data', 'rpc_error', r => ({id: r.id, error: {...missing, data: null}})],
    ['error data', 'rpc_error', r => ({id: r.id, error: {...missing, data: {reason: 'outage'}}})],
    ['extra error field', 'rpc_error', r => ({id: r.id, error: {...missing, extra: true}})],
    ['error string', 'rpc_error', r => ({id: r.id, error: missing.message})],
    ['error array', 'rpc_error', r => ({id: r.id, error: [-5, missing.message]})],
    ['nonnull result with error', 'rpc_error', r => ({id: r.id, error: missing, result: {txid}})],
    ['unmatched response id', 'response_id', r => ({id: r.id + 1, error: missing})],
    ['invalid response version', 'response_envelope', r => ({jsonrpc: '1.0', id: r.id, error: missing})],
    ['bare null', 'result_null', r => ({id: r.id, result: null})],
    ['success null', 'result_null', r => ({id: r.id, error: null, result: null})],
    ['missing result', 'result_missing', r => ({id: r.id, error: null})],
  ];
  for (const [name, code, response] of cases) await t.test(name, async () => {
    make = response;
    await assert.rejects(f.source.getUnboundTransaction(txid), failure(code));
  });
});

test('inactive mempool and submission errors stay errors, while an observed empty verbose pool is returned', async t => {
  let error: unknown = {code: -1, message: 'mempool is not active: wait for Zebra to sync to the tip'};
  const f = await fixture(t, request => ({jsonrpc: '2.0', id: request.id, ...(error ? {error} : {result: {}})}));
  await assert.rejects(f.source.getMempoolEntries(), failure('rpc_error'));
  error = {code: -25, message: 'private rejection detail'};
  await assert.rejects(f.source.sendRawTransaction('00'), failure('rpc_error'));
  error = null;
  assert.deepEqual(await f.source.getMempoolEntries(), {});
});

test('duplicate wire fields cannot normalize an RPC error into absence', async t => {
  let duplicated = true;
  const f = await fixture(t, request => duplicated
    ? `{"jsonrpc":"2.0","id":${request.id},"error":{"code":-1,"code":-5,"message":"${missing.message}"}}`
    : ` { "error": { "message": "${missing.message}", "code": -5 }, "id": ${request.id}, "jsonrpc": "2.0" } `);
  await assert.rejects(f.source.getUnboundTransaction(txid), failure('rpc_error'));
  duplicated = false;
  assert.equal(await f.source.getUnboundTransaction(txid), null);
});

test('submission has a two-million-byte hex bound without enlarging read requests', async t => {
  const f = await fixture(t, request => ({id: request.id, result: txid}));
  const maximum = 'ab'.repeat(2_000_000);
  assert.equal(await f.source.sendRawTransaction(maximum), txid);
  assert.equal(f.calls[0].params[0], maximum);
  assert.ok(f.sizes[0] > 4_000_000 && f.sizes[0] <= 4_001_024);
  for (const invalid of ['', '0', 'AB', 'gg', maximum + '00', 1, null]) {
    await assert.rejects(f.source.sendRawTransaction(invalid as string), failure('request'));
  }
  for (const invalid of ['aa', txid.toUpperCase(), 'aa'.repeat(33), '', null, 1]) {
    await assert.rejects(f.source.getBlock(invalid as string), failure('request'));
    await assert.rejects(f.source.getUnboundTransaction(invalid as string), failure('request'));
  }
  await f.source.getAddressUtxos('\u0000'.repeat(128));
  assert.ok(f.sizes[1] <= 1024);
  await assert.rejects(f.source.getAddressUtxos('\u0000'.repeat(129)), failure('request'));
  assert.equal(f.calls.length, 2);
});
