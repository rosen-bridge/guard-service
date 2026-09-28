const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const MAX_REQUEST_BYTES = 1024;
const MAX_TRANSACTION_HEX = 4_000_000;
const MAX_SUBMISSION_REQUEST_BYTES = MAX_TRANSACTION_HEX + 1024;
const MAX_TIMEOUT_MS = 2_147_483_647;

export class ZcashRpcEvidenceError extends Error {
  constructor(readonly code: string) {
    super(`Zcash RPC evidence ${code} failure`);
    this.name = 'ZcashRpcEvidenceError';
  }
}

function fail(code: string): never { throw new ZcashRpcEvidenceError(code); }
function uint(value: unknown, maximum: number, code: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
      Object.is(value, -0) || value > maximum) fail(code);
  return value;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail('request');
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('response_envelope');
  return value as Record<string, unknown>;
}
function exactMissingEncoding(json: string, parsed: unknown): boolean {
  if (json.length > 1024) return false;
  let compact = '', inString = false, escaped = false;
  for (const char of json) {
    if (inString) {
      compact += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true; compact += char;
    } else if (!' \t\r\n'.includes(char)) compact += char;
  }
  return compact === JSON.stringify(parsed);
}

export interface ZcashRpcEvidenceOptions {
  rpcUrl: string;
  auth?: {username: string; password: string};
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export class ZcashRpcEvidenceSource {
  readonly #url: string;
  readonly #authorization: string | undefined;
  readonly #timeout: number;
  readonly #limit: number;
  #nextId = 1;

  constructor(options: ZcashRpcEvidenceOptions) {
    if (typeof options?.rpcUrl !== 'string' ||
        !/^http:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?(?:\/[^?#\s]*)?$/.test(options.rpcUrl)) fail('configuration');
    let url: URL;
    try { url = new URL(options.rpcUrl); } catch { fail('configuration'); }
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash) fail('configuration');
    this.#url = url.href;
    this.#timeout = uint(options.timeoutMs ?? 10_000, MAX_TIMEOUT_MS, 'configuration');
    this.#limit = uint(options.maxResponseBytes ?? MAX_RESPONSE_BYTES, MAX_RESPONSE_BYTES, 'configuration');
    if (this.#timeout === 0 || this.#limit === 0) fail('configuration');
    if (options.auth !== undefined) {
      const auth = options.auth;
      if (auth === null || typeof auth !== 'object' || Array.isArray(auth) ||
          typeof auth.username !== 'string' || typeof auth.password !== 'string' ||
          auth.username.includes(':') || auth.username.length > 1024 || auth.password.length > 1024) fail('configuration');
      this.#authorization = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64');
    }
    Object.freeze(this);
  }

  private async rpc(method: string, params: unknown[], nullable = false, missingTransaction = false): Promise<unknown> {
    if (!Number.isSafeInteger(this.#nextId)) fail('request');
    const id = this.#nextId++;
    const body = JSON.stringify({jsonrpc: '2.0', id, method, params});
    const requestLimit = method === 'sendrawtransaction' ? MAX_SUBMISSION_REQUEST_BYTES : MAX_REQUEST_BYTES;
    if (Buffer.byteLength(body) > requestLimit) fail('request');
    const signal = AbortSignal.timeout(this.#timeout);
    let bytes: Uint8Array;
    try {
      const headers: Record<string, string> = {'content-type': 'application/json'};
      if (this.#authorization !== undefined) headers.authorization = this.#authorization;
      const response = await fetch(this.#url, {method: 'POST', body, headers, signal, redirect: 'error'});
      if (!response.ok) {
        await response.body?.cancel();
        fail('http_status');
      }
      const length = response.headers.get('content-length');
      if (length !== null && /^\d+$/.test(length) && BigInt(length) > BigInt(this.#limit)) {
        await response.body?.cancel();
        fail('response_size');
      }
      if (response.body === null) fail('response_encoding');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          total += next.value.byteLength;
          if (total > this.#limit) {
            await reader.cancel();
            fail('response_size');
          }
          chunks.push(next.value);
        }
      } finally { reader.releaseLock(); }
      bytes = Buffer.concat(chunks, total);
    } catch (error) {
      if (error instanceof ZcashRpcEvidenceError) throw error;
      fail(signal.aborted ? 'timeout' : 'transport');
    }

    const valueLexemes = new WeakMap<object, string>();
    let parsed: unknown;
    let json: string;
    try {
      json = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      // Record the original numeric token on its holder; normalize only result.value.
      parsed = JSON.parse(json, function(this: object, key: string, value: unknown,
        context?: {source?: string}) {
        if (key === 'value' && typeof value === 'number' && typeof context?.source === 'string') {
          valueLexemes.set(this, context.source);
        }
        return value;
      });
    } catch { fail('response_encoding'); }
    const envelope = record(parsed);
    if (Object.hasOwn(envelope, 'jsonrpc') && envelope.jsonrpc !== '2.0') fail('response_envelope');
    if (!Object.hasOwn(envelope, 'id') || envelope.id !== id) fail('response_id');
    if (Object.hasOwn(envelope, 'error') && envelope.error !== null) {
      const error = envelope.error;
      // Zebra f5c5277: only unbound lookup's exact -5/no-data outcome denotes absence.
      if (missingTransaction && error !== null && typeof error === 'object' && !Array.isArray(error) &&
        Object.keys(error).length === 2 && Object.hasOwn(error, 'code') && Object.hasOwn(error, 'message') &&
        (error as Record<string, unknown>).code === -5 &&
        (error as Record<string, unknown>).message === 'Transaction not found in mempool or best chain' &&
        (!Object.hasOwn(envelope, 'result') || envelope.result === null) && exactMissingEncoding(json, envelope)) return null;
      fail('rpc_error');
    }
    if (!Object.hasOwn(envelope, 'result')) fail('result_missing');
    const result = envelope.result;
    if (result === null) {
      if (!nullable) fail('result_null');
      return null;
    }
    if (method === 'gettxout') {
      const output = record(result);
      const lexeme = valueLexemes.get(output);
      if (!Object.hasOwn(output, 'value') || typeof output.value !== 'number' || lexeme === undefined) fail('result_value');
      return {...output, value: lexeme};
    }
    return result;
  }

  async getGenesisHash(): Promise<unknown> { return this.rpc('getblockhash', [0]); }
  async getBlockHash(height: number): Promise<unknown> {
    return this.rpc('getblockhash', [uint(height, 0xffff_ffff, 'request')]);
  }
  async getBlockchainInfo(): Promise<unknown> { return this.rpc('getblockchaininfo', []); }
  async getAddressUtxos(address: string): Promise<unknown> {
    if (typeof address !== 'string' || address.length < 1 || address.length > 128) fail('request');
    return this.rpc('getaddressutxos', [{addresses: [address], chainInfo: true}]);
  }
  async getTxOut(txid: string, index: number): Promise<unknown> {
    return this.rpc('gettxout', [hash(txid), uint(index, 0xffff_ffff, 'request'), true], true);
  }
  async getTransaction(txid: string, blockHash: string): Promise<unknown> {
    return this.rpc('getrawtransaction', [hash(txid), 1, hash(blockHash)]);
  }
  async getBlock(blockHash: string): Promise<unknown> {
    return this.rpc('getblock', [hash(blockHash), 1]);
  }
  async getUnboundTransaction(txid: string): Promise<unknown | null> {
    return this.rpc('getrawtransaction', [hash(txid), 1], false, true);
  }
  async getMempoolEntries(): Promise<unknown> {
    return this.rpc('getrawmempool', [true]);
  }
  async sendRawTransaction(rawHex: string): Promise<unknown> {
    if (typeof rawHex !== 'string' || rawHex.length < 2 || rawHex.length > MAX_TRANSACTION_HEX ||
      rawHex.length % 2 || !/^[0-9a-f]+$/.test(rawHex)) fail('request');
    return this.rpc('sendrawtransaction', [rawHex]);
  }
}
