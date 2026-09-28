import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import test from 'node:test';
import {ZcashRpcEvidenceSource, ZcashRpcEvidenceError} from '../lib/rpcEvidenceSource.js';

const address = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
test('address discovery sends one address and chainInfo through the bounded RPC envelope', async () => {
  const requests: unknown[] = [];
  let result: unknown = {utxos: [], hash: 'aa'.repeat(32), height: 107};
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body);
    requests.push(parsed);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({jsonrpc: '2.0', id: parsed.id, error: null, result}));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const info = server.address();
    assert.ok(info && typeof info !== 'string');
    const source = new ZcashRpcEvidenceSource({rpcUrl: `http://127.0.0.1:${info.port}`});
    assert.deepEqual(await source.getAddressUtxos(address), result);
    assert.deepEqual(requests, [{jsonrpc: '2.0', id: 1, method: 'getaddressutxos',
      params: [{addresses: [address], chainInfo: true}]}]);
    result = null;
    await assert.rejects(source.getAddressUtxos(address), error =>
      error instanceof ZcashRpcEvidenceError && error.code === 'result_null');
    for (const invalid of ['', 'x'.repeat(129), 1, null]) {
      await assert.rejects(source.getAddressUtxos(invalid as string), error =>
        error instanceof ZcashRpcEvidenceError && error.code === 'request');
    }
    assert.equal(requests.length, 2);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
