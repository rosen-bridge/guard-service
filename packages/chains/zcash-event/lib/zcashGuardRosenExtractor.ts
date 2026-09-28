import {
  AbstractRosenDataExtractor,
  ZcashRpcRosenExtractor,
  type RosenData,
  type ZcashRpcRosenExtractorOptions,
  type ZcashRpcTransaction,
} from '@rosen-bridge/rosen-extractor';

/** Missing or contradictory source evidence must defer the event. */
export class ZcashGuardEvidenceError extends Error {
  constructor(
    readonly code:
      | 'source'
      | 'envelope'
      | 'identity'
      | 'block'
      | 'serialization'
      | 'configuration',
  ) {
    super('Zcash guard ' + code + ' failure');
    this.name = 'ZcashGuardEvidenceError';
  }
}

export function isZcashHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/** Copy only authoritative envelope fields; verbose RPC display fields are ignored. */
export function projectZcashTransaction(value: unknown): ZcashRpcTransaction {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ZcashGuardEvidenceError('envelope');
  }
  const { txid, hex, size, blockhash, height } = value as Record<
    string,
    unknown
  >;
  if (
    !isZcashHash(txid) ||
    !isZcashHash(blockhash) ||
    typeof hex !== 'string' ||
    hex.length === 0 ||
    hex.length > 4_000_000 ||
    !/^(?:[0-9a-f]{2})+$/.test(hex) ||
    !Number.isSafeInteger(size) ||
    size !== hex.length / 2 ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(height) ||
    height < 0 ||
    Object.is(height, -0)
  ) {
    throw new ZcashGuardEvidenceError('envelope');
  }
  return { txid, hex, size: size as number, blockhash, height };
}

export function serializeZcashTransaction(transaction: unknown): string {
  return JSON.stringify(projectZcashTransaction(transaction));
}

export function deserializeZcashTransaction(
  serialized: string,
): ZcashRpcTransaction {
  if (typeof serialized !== 'string' || serialized.length > 4_000_512) {
    throw new ZcashGuardEvidenceError('serialization');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new ZcashGuardEvidenceError('serialization');
  }
  const transaction = projectZcashTransaction(parsed);
  // Reject duplicate keys, extra fields, number/string coercion and alternative encodings.
  if (JSON.stringify(transaction) !== serialized)
    throw new ZcashGuardEvidenceError('serialization');
  return transaction;
}

/** Actual Rosen string interface, with exactly one native-backed Rosen getter. */
export class ZcashGuardRosenExtractor extends AbstractRosenDataExtractor<string> {
  readonly chain = 'zcash';
  private readonly delegate: ZcashRpcRosenExtractor;

  constructor(options: ZcashRpcRosenExtractorOptions) {
    super(
      options.lockAddress,
      options.tokens,
      options.logger,
      options.storeRawData,
    );
    this.delegate = new ZcashRpcRosenExtractor(options);
  }

  // Delegation owns validation, amount conversion and fail-closed error handling.
  override get = (serialized: string): RosenData | undefined =>
    this.delegate.get(deserializeZcashTransaction(serialized));

  extractData = (serialized: string): RosenData | undefined =>
    this.delegate.extractData(deserializeZcashTransaction(serialized));
}
