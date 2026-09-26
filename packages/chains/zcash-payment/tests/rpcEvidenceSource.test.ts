import assert from 'node:assert/strict';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {test} from 'node:test';
import {ZcashRpcEvidenceSource, ZcashRpcEvidenceError} from '../lib/rpcEvidenceSource.js';

const txid = '11'.repeat(32);
const blockHash = '22'.repeat(32);
type Handler = (request: IncomingMessage, response: ServerResponse, body: Record<string, unknown>) => void;

async function server(handler: Handler): Promise<{url: string; close: () => Promise<void>}> {
  const value = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    handler(request, response, JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
  });
  await new Promise<void>(resolve => value.listen(0, '127.0.0.1', resolve));
  const address = value.address();
  assert.ok(address && typeof address !== 'string');
  return {url: `http://127.0.0.1:${address.port}`, close: async () => {
    value.closeAllConnections();
    await new Promise<void>((resolve, reject) => value.close(error => error ? reject(error) : resolve()));
  }};
}
function errorCode(code: string): (error: unknown) => boolean {
  return error => error instanceof ZcashRpcEvidenceError && error.code === code &&
    error.message === `Zcash RPC evidence ${code} failure`;
}
function reply(response: ServerResponse, id: unknown, result: unknown): void {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({jsonrpc: '2.0', id, result, error: null}));
}

test('RPC methods send exact bound arguments, unique IDs, and immutable credentials', async () => {
  const seen: Record<string, unknown>[] = [];
  const local = await server((request, response, body) => {
    seen.push(body);
    assert.equal(request.headers.authorization, 'Basic ' + Buffer.from('reader:synthetic').toString('base64'));
    if (body.method === 'gettxout') reply(response, body.id, {value: 1, confirmations: 2});
    else reply(response, body.id, 'result');
  });
  try {
    const auth = {username: 'reader', password: 'synthetic'};
    const source = new ZcashRpcEvidenceSource({rpcUrl: local.url, auth});
    auth.password = 'changed';
    assert.ok(Object.isFrozen(source));
    await source.getGenesisHash(); await source.getBlockHash(9); await source.getBlockchainInfo();
    assert.deepEqual(await source.getTxOut(txid, 3), {value: '1', confirmations: 2});
    await source.getTransaction(txid, blockHash);
    assert.deepEqual(seen.map(body => [body.method, body.params]), [
      ['getblockhash', [0]], ['getblockhash', [9]], ['getblockchaininfo', []],
      ['gettxout', [txid, 3, true]], ['getrawtransaction', [txid, 1, blockHash]],
    ]);
    assert.deepEqual(seen.map(body => body.id), [1, 2, 3, 4, 5]);
    assert.ok(seen.every(body => body.jsonrpc === '2.0'));
  } finally { await local.close(); }
});

test('gettxout preserves each original numeric lexeme without rounding other metadata', async () => {
  for (const lexeme of ['0.00000001', '1e-8', '21000000.00000000', '20999999.99999999', '0.123456780000000001']) {
    const local = await server((_request, response, body) => {
      response.end(`{"id":${body.id},"result":{"value":${lexeme},"confirmations":3,"nested":{"value":2}},"error":null}`);
    });
    try {
      const result = await new ZcashRpcEvidenceSource({rpcUrl: local.url}).getTxOut(txid, 0);
      assert.deepEqual(result, {value: lexeme, confirmations: 3, nested: {value: 2}}, lexeme);
    } finally { await local.close(); }
  }
});

test('only gettxout permits null, and monetary strings or missing values are refused', async () => {
  let result: unknown = null;
  const local = await server((_request, response, body) => reply(response, body.id, result));
  try {
    const source = new ZcashRpcEvidenceSource({rpcUrl: local.url});
    assert.equal(await source.getTxOut(txid, 0), null);
    for (const operation of [() => source.getGenesisHash(), () => source.getBlockHash(1),
      () => source.getBlockchainInfo(), () => source.getTransaction(txid, blockHash)]) {
      await assert.rejects(operation(), errorCode('result_null'));
    }
    for (result of [{value: '0.00000001'}, {}, {value: null}, {value: true}]) {
      await assert.rejects(source.getTxOut(txid, 0), errorCode('result_value'));
    }
  } finally { await local.close(); }
});

test('RPC envelope IDs, errors, result presence, and versions fail distinctly', async () => {
  const cases: Array<[string, (id: unknown) => unknown]> = [
    ['response_id', id => ({id: String(id), result: 'ok'})],
    ['response_id', () => ({result: 'ok'})],
    ['response_id', () => ({id: 999, result: 'ok'})],
    ['rpc_error', id => ({id, result: null, error: {message: 'sensitive server detail'}})],
    ['rpc_error', id => ({id, result: 'ok', error: false})],
    ['result_missing', id => ({id, error: null})],
    ['response_envelope', id => ({id, jsonrpc: '1.0', result: 'ok'})],
    ['response_envelope', id => ([{id, result: 'ok'}])],
  ];
  for (const [code, make] of cases) {
    const local = await server((_request, response, body) => response.end(JSON.stringify(make(body.id))));
    try { await assert.rejects(new ZcashRpcEvidenceSource({rpcUrl: local.url}).getGenesisHash(), errorCode(code)); }
    finally { await local.close(); }
  }
});

test('invalid UTF-8, malformed JSON, HTTP errors, and interrupted bodies expose no response details', async () => {
  for (const [code, send] of [
    ['response_encoding', (response: ServerResponse) => response.end(Buffer.from([0xff]))],
    ['response_encoding', (response: ServerResponse) => response.end('{malformed synthetic secret')],
    ['http_status', (response: ServerResponse) => { response.statusCode = 503; response.end('synthetic secret'); }],
    ['transport', (response: ServerResponse) => { response.writeHead(200, {'content-length': '100'}); response.write('{'); response.destroy(); }],
  ] as const) {
    const local = await server((_request, response) => { send(response); });
    try { await assert.rejects(new ZcashRpcEvidenceSource({rpcUrl: local.url}).getGenesisHash(), errorCode(code)); }
    finally { await local.close(); }
  }
});

test('redirects are rejected before a second endpoint receives a request', async () => {
  let targetCalls = 0;
  const target = await server((_request, response, body) => { targetCalls++; reply(response, body.id, 'unexpected'); });
  const origin = await server((_request, response) => {
    response.writeHead(307, {location: target.url}); response.end();
  });
  try {
    await assert.rejects(new ZcashRpcEvidenceSource({rpcUrl: origin.url}).getGenesisHash(), errorCode('transport'));
    assert.equal(targetCalls, 0);
  } finally { await origin.close(); await target.close(); }
});

test('HTTP refusal cancels an unfinished error body immediately', async () => {
  let closed = false;
  const local = await server((_request, response) => {
    response.on('close', () => { closed = true; });
    response.writeHead(503); response.write('untrusted body remains open');
  });
  try {
    await assert.rejects(new ZcashRpcEvidenceSource({rpcUrl: local.url, timeoutMs: 5000}).getGenesisHash(), errorCode('http_status'));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(closed, true, 'rejected HTTP response must release its streaming body');
  } finally { await local.close(); }
});

test('response byte limits apply to declared and streamed bodies, with exact boundary accepted', async () => {
  for (const declared of [false, true]) {
    let padding = 0;
    const local = await server((_request, response, body) => {
      const text = JSON.stringify({id: body.id, result: 'ok'}) + ' '.repeat(padding);
      if (declared) response.setHeader('content-length', Buffer.byteLength(text));
      else response.setHeader('transfer-encoding', 'chunked');
      response.end(text);
    });
    try {
      const length = Buffer.byteLength(JSON.stringify({id: 1, result: 'ok'}));
      const source = new ZcashRpcEvidenceSource({rpcUrl: local.url, maxResponseBytes: length});
      assert.equal(await source.getGenesisHash(), 'ok');
      padding = 1;
      await assert.rejects(source.getGenesisHash(), errorCode('response_size'));
    } finally { await local.close(); }
  }
});

test('timeout bounds both waiting for headers and reading an unfinished body', async () => {
  for (const headers of [false, true]) {
    const local = await server((_request, response) => {
      if (headers) { response.writeHead(200); response.write('{'); }
    });
    try { await assert.rejects(new ZcashRpcEvidenceSource({rpcUrl: local.url, timeoutMs: 100}).getGenesisHash(), errorCode('timeout')); }
    finally { await local.close(); }
  }
});

test('configuration and request validation reject aliases and unsupported arguments before transport', async () => {
  for (const rpcUrl of ['https://127.0.0.1', 'http://localhost', 'http://127.1', 'http://2130706433',
    'http://0x7f000001', 'http://127.0.0.1@evil.invalid', 'http://user:secret@127.0.0.1',
    'http://127.0.0.1/?', 'http://127.0.0.1/#', 'http://127.0.0.1/?q=1', 'http://127.0.0.1/#x',
    'http://[::ffff:127.0.0.1]', 'http://127.0.0.1:65536']) {
    assert.throws(() => new ZcashRpcEvidenceSource({rpcUrl}), errorCode('configuration'), rpcUrl);
  }
  assert.ok(new ZcashRpcEvidenceSource({rpcUrl: 'http://[::1]:1234/rpc'}));
  for (const timeoutMs of [0, -1, -0, 0.5, 2_147_483_648, NaN]) {
    assert.throws(() => new ZcashRpcEvidenceSource({rpcUrl: 'http://127.0.0.1', timeoutMs}), errorCode('configuration'));
  }
  for (const maxResponseBytes of [0, -1, 0.5, 64 * 1024 * 1024 + 1, Infinity]) {
    assert.throws(() => new ZcashRpcEvidenceSource({rpcUrl: 'http://127.0.0.1', maxResponseBytes}), errorCode('configuration'));
  }
  const source = new ZcashRpcEvidenceSource({rpcUrl: 'http://127.0.0.1:1'});
  for (const height of [-1, -0, 1.5, 0x1_0000_0000]) await assert.rejects(source.getBlockHash(height), errorCode('request'));
  await assert.rejects(source.getTxOut('AB'.repeat(32), 0), errorCode('request'));
  await assert.rejects(source.getTxOut(txid, -1), errorCode('request'));
  await assert.rejects(source.getTransaction(txid, undefined as unknown as string), errorCode('request'));
});
