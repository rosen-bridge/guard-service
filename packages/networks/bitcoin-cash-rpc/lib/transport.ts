import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

import { BitcoinCashRpcConfig, RpcTransport } from './types';

export class BitcoinCashRpcError extends Error {
  /**
   * Represent a validated RPC rejection without retaining its server message.
   * @param code - Integer error code from the authenticated response envelope
   */
  constructor(readonly code: number) {
    super(`BCH RPC rejected request (code ${code})`);
  }
}

class RpcResponseError extends Error {}

/**
 * Detect ASCII control characters without normalizing the configured value.
 * @param value - Endpoint or credential text
 * @returns Whether the text contains an ASCII control character
 */
const hasControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

/**
 * Validate RPC endpoint syntax and require TLS outside literal loopback hosts.
 * @param url - Operator endpoint without URL credentials or a fragment
 * @returns The parsed endpoint used by the HTTP client
 */
export const validateBitcoinCashRpcEndpoint = (url: string): URL => {
  // Check raw syntax before WHATWG normalization can hide ambiguous authority.
  const authority =
    typeof url === 'string'
      ? /^https?:\/\/([^/?#]+)/i.exec(url)?.[1]
      : undefined;
  if (
    !authority ||
    /[\s\\#]/.test(url) ||
    hasControlCharacter(url) ||
    authority.includes('@')
  )
    throw Error('Invalid RPC endpoint');
  let endpoint: URL;
  try {
    endpoint = new URL(url);
  } catch {
    throw Error('Invalid RPC endpoint');
  }
  if (endpoint.username || endpoint.password || endpoint.hash)
    throw Error('Invalid RPC endpoint');
  const rawHost = authority.startsWith('[')
    ? authority.slice(1, authority.indexOf(']'))
    : authority.split(':')[0];
  const loopback =
    (isIP(rawHost) === 4 && endpoint.hostname.startsWith('127.')) ||
    (isIP(rawHost) === 6 && endpoint.hostname === '[::1]');
  if (endpoint.protocol === 'http:' && !loopback)
    throw Error('RPC endpoint requires HTTPS outside literal loopback');
  return endpoint;
};

/**
 * Resolve and validate a positive, safe integer work limit.
 * @param value - Configured limit; undefined selects fallback
 * @param fallback - Default limit when value is absent
 * @param maximum - Largest permitted limit, inclusive
 * @returns The validated configured or default limit
 */
export const boundedInteger = (
  value: number | undefined,
  fallback: number,
  maximum: number,
): number => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum)
    throw Error('Invalid RPC work limit');
  return result;
};

/**
 * Create a bounded JSON-RPC transport with sanitized transport errors.
 * Credentials remain in the request closure and never enter error messages.
 * @param config - Endpoint, optional authentication and response work limits
 * @param fetcher - HTTP implementation; defaults to the platform fetch
 * @returns A transport whose calls validate the response identity and envelope
 */
export const createBitcoinCashRpcTransport = (
  config: BitcoinCashRpcConfig,
  fetcher: typeof fetch = fetch,
): RpcTransport => {
  const endpoint = validateBitcoinCashRpcEndpoint(config.url);
  if (
    config.auth !== undefined &&
    (!config.auth ||
      [config.auth.username, config.auth.password].some(
        (value) =>
          typeof value !== 'string' ||
          !value.length ||
          value.length > 1024 ||
          value !== value.trim() ||
          hasControlCharacter(value),
      ) ||
      config.auth.username.includes(':'))
  )
    throw Error(
      'RPC credentials must be a valid separate username/password pair',
    );
  const timeoutMs = boundedInteger(config.timeoutMs, 10_000, 60_000);
  const maxBytes = boundedInteger(
    config.maxResponseBytes,
    8_000_000,
    64_000_000,
  );
  const authorization = config.auth
    ? `Basic ${Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64')}`
    : undefined;
  return {
    /**
     * Send one request and validate its bounded response before returning data.
     * @param method - BCHN RPC method name
     * @param params - Positional method arguments
     * @returns The result field of a matching successful response
     */
    call: async (method, params) => {
      const id = randomUUID();
      const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      if (body.length > 2_000_000)
        throw Error('RPC request size limit exceeded');
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), timeoutMs);
      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(authorization ? { authorization } : {}),
          },
          body,
          signal: abort.signal,
          redirect: 'error',
        });
        const length = response.headers.get('content-length');
        if (
          length !== null &&
          (!/^\d+$/.test(length) || Number(length) > maxBytes)
        ) {
          await response.body?.cancel().catch(() => undefined);
          throw new RpcResponseError('RPC response size limit exceeded');
        }
        if (!response.body)
          throw new RpcResponseError('Missing RPC response body');
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          for (;;) {
            const next = await reader.read();
            if (next.done) break;
            size += next.value.length;
            if (size > maxBytes)
              throw new RpcResponseError('RPC response size limit exceeded');
            if (chunks.length >= 4096)
              throw new RpcResponseError(
                'RPC response chunk cardinality limit exceeded',
              );
            chunks.push(next.value);
          }
        } finally {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
        } catch {
          throw new RpcResponseError('Malformed RPC JSON response');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new RpcResponseError('Invalid RPC envelope');
        const value = parsed as Record<string, unknown>;
        if (
          value.id !== id ||
          (value.jsonrpc !== undefined && value.jsonrpc !== '2.0') ||
          !Object.hasOwn(value, 'result') ||
          !Object.hasOwn(value, 'error')
        )
          throw new RpcResponseError('Invalid RPC envelope identity or shape');
        if (value.error !== null) {
          const error = value.error as Record<string, unknown>;
          if (
            !error ||
            typeof error !== 'object' ||
            Array.isArray(error) ||
            !Number.isSafeInteger(error.code) ||
            typeof error.message !== 'string' ||
            error.message.length > 4096 ||
            value.result !== null
          )
            throw new RpcResponseError('Malformed RPC error');
          throw new BitcoinCashRpcError(error.code as number);
        }
        if (!response.ok) throw new RpcResponseError('RPC HTTP failure');
        return value.result;
      } catch (error) {
        if (error instanceof BitcoinCashRpcError) throw error;
        if (error instanceof RpcResponseError) throw error;
        throw Error('BCH RPC transport failed');
      } finally {
        clearTimeout(timer);
      }
    },
  };
};
