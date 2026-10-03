import { once } from 'node:events';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { createBitcoinCashRpcTransport } from '../lib/transport';
import { BitcoinCashRpcConfig } from '../lib/types';

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
  describe('endpoint policy', () => {
    /**
     * @target createBitcoinCashRpcTransport - rejects plaintext remote hosts
     * @dependencies Actual HTTP transport constructor
     * @scenario Change only the endpoint to a non-loopback or ambiguous HTTP host
     * @expected Reject before dispatch, including DNS and normalized IPv4 aliases
     */
    it.each([
      'http://rpc.example.test',
      'http://localhost',
      'http://LOCALHOST.',
      'http://127.0.0.1.example.test',
      'http://192.168.1.1',
      'http://0.0.0.0',
      'http://126.255.255.255',
      'http://128.0.0.1',
      'http://[::]',
      'http://[::2]',
      'http://[::ffff:127.0.0.1]',
      'http://[::ffff:7f00:1]',
      'http://127.1',
      'http://2130706433',
      'http://0x7f000001',
      'http://0177.0.0.1',
      'http://127.0.0.1.',
      'http://%31%32%37.0.0.1',
    ])('rejects plaintext endpoint %s at construction', (url) => {
      expect(() => createBitcoinCashRpcTransport({ ...config, url })).toThrow(
        'HTTPS outside literal loopback',
      );
    });

    /**
     * @target createBitcoinCashRpcTransport - rejects malformed authority
     * @dependencies Actual HTTP transport constructor
     * @scenario Change only URL syntax or add userinfo or a fragment marker
     * @expected Reject with a static message that contains no endpoint contents
     */
    it.each([
      'https://fixture-user:fixture-pass@rpc.example.test',
      'https://fixture-user@rpc.example.test',
      'https://:fixture-pass@rpc.example.test',
      'https://@rpc.example.test',
      'https://rpc.example.test/#',
      'https://rpc.example.test/#fragment',
      'https:///rpc.example.test',
      'https:rpc.example.test',
      'https://rpc.example.test\\@127.0.0.1',
      ' https://rpc.example.test',
      'https://rpc.example.test\n',
      'https://rpc.exa\tmple.test',
      'https://rpc.example.test:65536',
      'http://[::1%25lo0]',
      'ftp://127.0.0.1',
      '//127.0.0.1',
      'not-a-url',
    ])('rejects ambiguous or credential-bearing endpoint %#', (url) => {
      expect(() => createBitcoinCashRpcTransport({ ...config, url })).toThrow(
        /^Invalid RPC endpoint$/,
      );
    });

    /**
     * @target createBitcoinCashRpcTransport.call - accepts TLS or literal loopback
     * @dependencies Actual transport constructor and injected response-only fetch
     * @scenario Construct and call with each permitted host representation
     * @expected Pass the parsed URL, separate credentials and redirect:error
     */
    it.each([
      [
        'https://rpc.example.test/wallet/name',
        'https://rpc.example.test/wallet/name',
      ],
      [
        'HTTPS://RPC.EXAMPLE.TEST:443/wallet/name',
        'https://rpc.example.test/wallet/name',
      ],
      ['https://192.168.1.1', 'https://192.168.1.1/'],
      [
        'http://127.0.0.1:18443/wallet/test',
        'http://127.0.0.1:18443/wallet/test',
      ],
      ['http://127.255.255.254', 'http://127.255.255.254/'],
      ['http://[::1]:18443', 'http://[::1]:18443/'],
      ['http://[0:0:0:0:0:0:0:1]', 'http://[::1]/'],
    ])('dispatches accepted endpoint %s', async (url, normalized) => {
      const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        return Response.json({ id: request.id, result: 4, error: null });
      });
      expect(() =>
        createBitcoinCashRpcTransport({ ...config, url }),
      ).not.toThrow();
      const transport = createBitcoinCashRpcTransport(
        { ...config, url },
        fetcher,
      );
      await expect(transport.call('getblockcount', [])).resolves.toEqual(4);
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        new URL(normalized),
        expect.objectContaining({
          redirect: 'error',
          headers: expect.objectContaining({
            authorization: `Basic ${Buffer.from('fixture-user:fixture-pass').toString('base64')}`,
          }),
        }),
      );
    });

    /**
     * @target createBitcoinCashRpcTransport - requires separate paired auth
     * @dependencies Actual HTTP transport constructor with deliberately untyped input
     * @scenario Remove or invalidate one credential field while URL stays valid
     * @expected Reject construction with a fixed credential-pair error
     */
    it.each([
      null,
      {},
      { username: 'fixture-user' },
      { password: 'fixture-pass' },
      { username: '', password: 'fixture-pass' },
      { username: 'fixture-user', password: '' },
      { username: 4, password: 'fixture-pass' },
      { username: 'fixture-user', password: 4 },
      { username: 'u'.repeat(1025), password: 'fixture-pass' },
      { username: 'fixture-user', password: 'p'.repeat(1025) },
      { username: 'fixture:user', password: 'fixture-pass' },
      { username: 'fixture\nuser', password: 'fixture-pass' },
      { username: 'fixture-user', password: 'fixture\npassword' },
      { username: ' fixture-user', password: 'fixture-pass' },
      { username: 'fixture-user', password: 'fixture-pass ' },
    ])('rejects invalid credential pair %#', (auth) => {
      expect(() =>
        createBitcoinCashRpcTransport({
          ...config,
          auth: auth as BitcoinCashRpcConfig['auth'],
        }),
      ).toThrow(
        /^RPC credentials must be a valid separate username\/password pair$/,
      );
    });

    describe('platform HTTP client', () => {
      const servers: Server[] = [];
      afterEach(async () => {
        for (const server of servers.splice(0)) {
          server.closeAllConnections();
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
        }
      });
      /**
       * Bind a fixture server on an OS-assigned loopback port.
       * @param server - HTTP server serving synthetic responses
       * @returns The local fixture base URL
       */
      const listen = async (server: Server): Promise<string> => {
        servers.push(server);
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      };

      /**
       * @target createBitcoinCashRpcTransport.call - sends optional separate auth
       * @dependencies Real Node fetch and a local HTTP fixture server
       * @scenario Send a valid RPC request with credentials present or absent
       * @expected Receive the result and only the configured Authorization header
       */
      it.each([true, false])(
        'calls literal loopback with auth=%s',
        async (authenticated) => {
          let authorization: string | undefined;
          const server = createServer(async (request, response) => {
            authorization = request.headers.authorization;
            const chunks: Buffer[] = [];
            for await (const chunk of request) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
            response.setHeader('content-type', 'application/json');
            response.end(
              JSON.stringify({ id: body.id, result: 4, error: null }),
            );
          });
          const transport = createBitcoinCashRpcTransport({
            ...config,
            url: await listen(server),
            auth: authenticated ? config.auth : undefined,
          });
          await expect(transport.call('getblockcount', [])).resolves.toEqual(4);
          expect(authorization).toEqual(
            authenticated
              ? `Basic ${Buffer.from('fixture-user:fixture-pass').toString('base64')}`
              : undefined,
          );
        },
      );

      /**
       * @target createBitcoinCashRpcTransport.call - refuses all HTTP redirects
       * @dependencies Real Node fetch and a local server with a second route
       * @scenario Return a redirect to another route on the same server
       * @expected Static transport failure; no second request or credential relay
       */
      it.each([301, 302, 303, 307, 308])(
        'does not follow status %s',
        async (status) => {
          const paths: string[] = [];
          const server = createServer((request, response) => {
            paths.push(request.url ?? '');
            request.resume();
            if (request.url === '/redirect') {
              response.writeHead(status, { location: '/destination' });
              response.end();
            } else {
              response.end('{}');
            }
          });
          const transport = createBitcoinCashRpcTransport({
            ...config,
            url: `${await listen(server)}/redirect`,
          });
          await expect(transport.call('getblockcount', [])).rejects.toThrow(
            /^BCH RPC transport failed$/,
          );
          expect(paths).toEqual(['/redirect']);
        },
      );
    });
  });
});
