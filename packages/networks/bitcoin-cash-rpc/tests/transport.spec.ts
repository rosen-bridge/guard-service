import { createBitcoinCashRpcTransport } from '../lib/transport';

const config = {
  url: 'http://127.0.0.1:18443',
  expectedChain: 'regtest' as const,
  auth: { username: 'fixture-user', password: 'fixture-pass' },
};
/**
 * Adapt a response factory to the fetch signature without making HTTP requests.
 * @param reply - Factory receiving the parsed JSON-RPC request body
 * @returns An injected fetch implementation returning the factory response
 */
const mockFetch = (
  reply: (request: Record<string, unknown>) => Response | Promise<Response>,
) =>
  (async (_url, init) => reply(JSON.parse(String(init?.body)))) as typeof fetch;
describe('createBitcoinCashRpcTransport', () => {
  describe('call', () => {
    /**
     * @target createBitcoinCashRpcTransport.call - requires response ID and
     * accepts the pinned JSON RPC result envelope
     * @dependencies mockFetch with a matching response ID and null error
     * @scenario Return a BCHN-style result envelope without an explicit
     * jsonrpc field.
     * @expected Resolve the result value 4.
     */
    it('requires response ID and accepts the pinned JSON RPC result envelope', async () => {
      const transport = createBitcoinCashRpcTransport(
        config,
        mockFetch((request) =>
          Response.json({ id: request.id, result: 4, error: null }),
        ),
      );
      expect(await transport.call('getblockcount', [])).toEqual(4);
    });
    /**
     * @target createBitcoinCashRpcTransport.call - rejects %s response
     * @dependencies mockFetch and matching request identity where applicable
     * @scenario Supply a wrong ID, batch, missing error, wrong version or
     * malformed error code.
     * @expected Reject every malformed envelope without returning a result.
     */
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
            Array.isArray(envelope)
              ? envelope
              : { id: request.id, ...envelope },
          ),
        ),
      );
      await expect(transport.call('method', [])).rejects.toThrow();
    });
    /**
     * @target createBitcoinCashRpcTransport.call - surfaces RPC codes without
     * printing RPC text or credentials
     * @dependencies mockFetch with HTTP 500 and a valid RPC error envelope
     * @scenario Return code -5 with the synthetic authentication password as
     * the server message.
     * @expected Retain code -5 in the rejection while excluding the password.
     */
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
    /**
     * @target createBitcoinCashRpcTransport.call - limits body bytes during
     * streaming even without Content-Length
     * @dependencies mockFetch and a two-chunk ReadableStream without
     * Content-Length
     * @scenario Stream 128 bytes against a configured 100-byte response limit.
     * @expected Reject with a size-limit error during streaming.
     */
    it('limits body bytes during streaming even without Content-Length', async () => {
      const fetcher = mockFetch(
        () =>
          new Response(
            new ReadableStream({
              /** Enqueue the controlled RPC response bytes into the fixture stream. */
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
    /**
     * @target createBitcoinCashRpcTransport.call - rejects oversized announced
     * bodies before reading
     * @dependencies mockFetch with an announced Content-Length of 101
     * @scenario Configure a 100-byte limit for the announced response body.
     * @expected Reject the oversized response with a size-limit error.
     */
    it('rejects oversized announced bodies before reading', async () => {
      const transport = createBitcoinCashRpcTransport(
        { ...config, maxResponseBytes: 100 },
        mockFetch(
          () => new Response('{}', { headers: { 'Content-Length': '101' } }),
        ),
      );
      await expect(transport.call('method', [])).rejects.toThrow('size limit');
    });
    /**
     * @target createBitcoinCashRpcTransport.call - applies a bounded timeout
     * and sanitizes transport failures
     * @dependencies Injected fetch that rejects with the synthetic password on
     * abort
     * @scenario Configure a five-millisecond timeout while the response stays
     * pending.
     * @expected Abort and reject with the sanitized transport-failed message.
     */
    it('applies a bounded timeout and sanitizes transport failures', async () => {
      const fetcher = (async (_url, init) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(Error(config.auth.password)),
          ),
        )) as typeof fetch;
      await expect(
        createBitcoinCashRpcTransport(
          { ...config, timeoutMs: 5 },
          fetcher,
        ).call('method', []),
      ).rejects.toThrow('transport failed');
    });

    describe('forged errors and chunk limits', () => {
      /**
       * @target createBitcoinCashRpcTransport.call - sanitizes forged
       * transport errors with internal-looking messages
       * @dependencies Injected fetch throwing an RPC-prefixed message
       * containing
       * the fixture password
       * @scenario Throw an ordinary transport error that resembles a trusted
       * internal error.
       * @expected Return the sanitized transport-failed rejection.
       */
      it('sanitizes forged transport errors with internal-looking messages', async () => {
        const fetcher = (async () => {
          throw Error(`RPC ${config.auth.password}`);
        }) as typeof fetch;
        const transport = createBitcoinCashRpcTransport(config, fetcher);
        await expect(transport.call('method', [])).rejects.toThrow(
          'transport failed',
        );
      });
      /**
       * @target createBitcoinCashRpcTransport.call - bounds tiny response
       * chunk cardinality
       * @dependencies mockFetch with a ReadableStream of one-byte chunks
       * @scenario Stream 4097 chunks while remaining below the default byte
       * limit.
       * @expected Reject specifically for response chunk cardinality.
       */
      it('bounds tiny response chunk cardinality', async () => {
        const fetcher = mockFetch(
          () =>
            new Response(
              new ReadableStream({
                /** Enqueue the controlled RPC response bytes into the fixture stream. */
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
  });
  /**
   * @target createBitcoinCashRpcTransport - rejects URL credentials and unsafe
   * limit values
   * @dependencies Synthetic regtest endpoint configuration
   * @scenario Put authentication in the endpoint URL or configure a zero
   * timeout.
   * @expected Reject both invalid configurations during transport
   * construction.
   */
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
});
