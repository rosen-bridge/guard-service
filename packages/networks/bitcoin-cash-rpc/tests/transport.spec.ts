import { createBitcoinCashRpcTransport } from '../lib/transport';

const config = {
  url: 'http://127.0.0.1:18443',
  expectedChain: 'regtest' as const,
  auth: { username: 'fixture-user', password: 'fixture-pass' },
};
const mockFetch = (
  reply: (request: Record<string, unknown>) => Response | Promise<Response>,
) =>
  (async (_url, init) => reply(JSON.parse(String(init?.body)))) as typeof fetch;
describe('bounded RPC HTTP transport', () => {
  it('requires response ID and accepts the pinned JSON RPC result envelope', async () => {
    const transport = createBitcoinCashRpcTransport(
      config,
      mockFetch((request) =>
        Response.json({ id: request.id, result: 4, error: null }),
      ),
    );
    expect(await transport.call('getblockcount', [])).toBe(4);
  });
  it.each([
    ['wrong id', { id: 'wrong', result: 4, error: null }],
    ['batch', []],
    ['missing error', { result: 4 }],
    ['invalid version', { jsonrpc: '1.0', result: 4, error: null }],
    [
      'malformed error',
      { result: null, error: { code: 'bad', message: 'text' } },
    ],
  ])('rejects %s response', async (_name, envelope) => {
    const transport = createBitcoinCashRpcTransport(
      config,
      mockFetch((request) =>
        Response.json(
          Array.isArray(envelope) ? envelope : { id: request.id, ...envelope },
        ),
      ),
    );
    await expect(transport.call('method', [])).rejects.toThrow();
  });
  it('surfaces RPC codes without printing RPC text or credentials', async () => {
    const transport = createBitcoinCashRpcTransport(
      config,
      mockFetch((request) =>
        Response.json(
          {
            id: request.id,
            result: null,
            error: { code: -5, message: config.auth.password },
          },
          { status: 500 },
        ),
      ),
    );
    await expect(transport.call('method', [])).rejects.toThrow('code -5');
    try {
      await transport.call('method', []);
    } catch (error) {
      expect(String(error)).not.toContain(config.auth.password);
    }
  });
  it('limits body bytes during streaming even without Content-Length', async () => {
    const fetcher = mockFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(64));
              controller.enqueue(new Uint8Array(64));
              controller.close();
            },
          }),
        ),
    );
    await expect(
      createBitcoinCashRpcTransport(
        { ...config, maxResponseBytes: 100 },
        fetcher,
      ).call('method', []),
    ).rejects.toThrow('size limit');
  });
  it('rejects oversized announced bodies before reading', async () => {
    const transport = createBitcoinCashRpcTransport(
      { ...config, maxResponseBytes: 100 },
      mockFetch(
        () => new Response('{}', { headers: { 'Content-Length': '101' } }),
      ),
    );
    await expect(transport.call('method', [])).rejects.toThrow('size limit');
  });
  it('applies a bounded timeout and sanitizes transport failures', async () => {
    const fetcher = (async (_url, init) =>
      new Promise<Response>((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(Error(config.auth.password)),
        ),
      )) as typeof fetch;
    await expect(
      createBitcoinCashRpcTransport({ ...config, timeoutMs: 5 }, fetcher).call(
        'method',
        [],
      ),
    ).rejects.toThrow('transport failed');
  });
  it('rejects URL credentials and unsafe limit values', () => {
    expect(() =>
      createBitcoinCashRpcTransport({
        ...config,
        url: 'http://user:pass@localhost',
      }),
    ).toThrow();
    expect(() =>
      createBitcoinCashRpcTransport({ ...config, timeoutMs: 0 }),
    ).toThrow();
  });
  it('sanitizes forged transport errors with internal-looking messages', async () => {
    const fetcher = (async () => {
      throw Error(`RPC ${config.auth.password}`);
    }) as typeof fetch;
    const transport = createBitcoinCashRpcTransport(config, fetcher);
    await expect(transport.call('method', [])).rejects.toThrow(
      'transport failed',
    );
  });
  it('bounds tiny response chunk cardinality', async () => {
    const fetcher = mockFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (let i = 0; i < 4097; i++)
                controller.enqueue(Uint8Array.of(0x20));
              controller.close();
            },
          }),
        ),
    );
    await expect(
      createBitcoinCashRpcTransport(config, fetcher).call('method', []),
    ).rejects.toThrow('chunk cardinality');
  });
});
