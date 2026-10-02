import { binToHex, hashTransaction, hexToBin } from '@bitauth/libauth';

import {
  BitcoinCashTx,
  decodeBchTransaction,
  BCH_MAX_MONEY,
} from '@rosen-chains/bitcoin-cash';

/**
 * Validate an RPC object, excluding null and arrays.
 * @param value - Untrusted RPC field
 * @returns The object for subsequent field validation
 */
export const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid RPC object');
  return value as Record<string, unknown>;
};
/**
 * Validate a canonical lowercase 32-byte hash.
 * @param value - Untrusted RPC hash
 * @returns The validated hexadecimal hash
 */
export const hash = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value))
    throw Error('Invalid RPC hash');
  return value;
};
/**
 * Validate a nonnegative safe integer within an inclusive bound.
 * @param value - Untrusted RPC integer
 * @param maximum - Inclusive upper bound; defaults to Number.MAX_SAFE_INTEGER
 * @returns The validated integer
 */
export const uint = (
  value: unknown,
  maximum = Number.MAX_SAFE_INTEGER,
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  )
    throw Error('Invalid RPC integer');
  return value;
};
/**
 * Validate an RPC array before iterating over its bounded elements.
 * @param value - Untrusted RPC collection
 * @param maximum - Maximum permitted element count, inclusive
 * @returns The array for subsequent element validation
 */
export const array = (value: unknown, maximum: number): unknown[] => {
  if (!Array.isArray(value) || value.length > maximum)
    throw Error('RPC cardinality limit exceeded');
  return value;
};
/**
 * Validate canonical lowercase hexadecimal bytes within a byte limit.
 * @param value - Untrusted RPC byte string
 * @param maximum - Maximum decoded byte count, inclusive
 * @param empty - Whether zero bytes are allowed; defaults to false
 * @returns The validated hexadecimal string
 */
export const hex = (value: unknown, maximum: number, empty = false): string => {
  if (
    typeof value !== 'string' ||
    value.length > maximum * 2 ||
    (!empty && !value.length) ||
    !/^(?:[0-9a-f]{2})*$/.test(value)
  )
    throw Error('Invalid bounded RPC hex');
  return value;
};
/**
 * Convert an RPC decimal BCH amount to exact nonnegative satoshis.
 * @param value - Decimal number or string, optionally using bounded exponent notation
 * @returns Exact satoshis within BCH_MAX_MONEY; fractional satoshis are rejected
 */
export const satoshis = (value: unknown): bigint => {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    String(value).length > 128
  )
    throw Error('Invalid RPC amount');
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(String(value));
  if (!match) throw Error('Invalid RPC decimal');
  const fraction = match[2] ?? '';
  const shift = 8 + Number(match[3] ?? 0) - fraction.length;
  if (!Number.isSafeInteger(shift) || Math.abs(shift) > 32)
    throw Error('RPC decimal exponent out of range');
  const digits = BigInt(match[1] + fraction);
  if (shift < 0 && digits % 10n ** BigInt(-shift))
    throw Error('Fractional RPC satoshi');
  const result =
    shift >= 0 ? digits * 10n ** BigInt(shift) : digits / 10n ** BigInt(-shift);
  if (result > BCH_MAX_MONEY) throw Error('RPC amount exceeds maximum money');
  return result;
};
/**
 * Decode canonical transaction bytes and cross-check their RPC metadata.
 * @param value - Untrusted verbose raw-transaction response
 * @param expectedId - Hash requested from the RPC endpoint
 * @returns Validated metadata, decoded transaction, bytes and coinbase status
 */
export const rawTransaction = (value: unknown, expectedId: string) => {
  const metadata = record(value);
  const rawHex = hex(metadata.hex, 1_000_000);
  const bytes = hexToBin(rawHex);
  const decoded = decodeBchTransaction(bytes, 1_000_000);
  if (decoded.inputs.length > 4096 || decoded.outputs.length > 4096)
    throw Error('Source transaction cardinality limit exceeded');
  if (
    hashTransaction(bytes) !== expectedId ||
    metadata.txid !== expectedId ||
    metadata.hash !== expectedId ||
    metadata.size !== bytes.length ||
    metadata.version !== decoded.version ||
    metadata.locktime !== decoded.locktime
  )
    throw Error('Raw transaction identity or scalar metadata mismatch');
  const inputs = array(metadata.vin, 4096);
  const outputs = array(metadata.vout, 4096);
  if (
    inputs.length !== decoded.inputs.length ||
    outputs.length !== decoded.outputs.length
  )
    throw Error('Transaction metadata cardinality mismatch');
  decoded.inputs.forEach((input, index) => {
    const item = record(inputs[index]);
    const coinbase =
      binToHex(input.outpointTransactionHash) === '00'.repeat(32) &&
      input.outpointIndex === 0xffffffff;
    if (
      coinbase
        ? item.coinbase !== binToHex(input.unlockingBytecode) ||
          item.txid !== undefined ||
          item.vout !== undefined
        : item.coinbase !== undefined ||
          item.txid !== binToHex(input.outpointTransactionHash) ||
          item.vout !== input.outpointIndex ||
          record(item.scriptSig).hex !== binToHex(input.unlockingBytecode)
    )
      throw Error('Raw transaction input metadata mismatch');
    if (item.sequence !== input.sequenceNumber)
      throw Error('Transaction sequence metadata mismatch');
  });
  decoded.outputs.forEach((output, index) => {
    const item = record(outputs[index]);
    if (
      item.n !== index ||
      satoshis(item.value) !== output.valueSatoshis ||
      record(item.scriptPubKey).hex !== binToHex(output.lockingBytecode)
    )
      throw Error('Raw transaction output metadata mismatch');
    if (!output.token) {
      if (item.tokenData !== undefined && item.tokenData !== null)
        throw Error('Invented RPC token metadata');
    } else if (item.tokenData !== undefined) {
      const token = record(item.tokenData);
      if (
        token.category !== binToHex(output.token.category) ||
        token.amount !== output.token.amount.toString()
      )
        throw Error('Token metadata mismatch');
      if (output.token.nft) {
        const nft = record(token.nft);
        if (
          nft.capability !== output.token.nft.capability ||
          nft.commitment !== binToHex(output.token.nft.commitment)
        )
          throw Error('NFT metadata mismatch');
      } else if (token.nft !== undefined) throw Error('Invented NFT metadata');
    }
  });
  if (metadata.confirmations !== undefined) uint(metadata.confirmations);
  if (metadata.time !== undefined) uint(metadata.time);
  if (metadata.blocktime !== undefined) uint(metadata.blocktime);
  if (metadata.blockhash !== undefined) hash(metadata.blockhash);
  const coinbase =
    decoded.inputs.length === 1 &&
    binToHex(decoded.inputs[0].outpointTransactionHash) === '00'.repeat(32) &&
    decoded.inputs[0].outpointIndex === 0xffffffff;
  return {
    metadata: metadata as unknown as BitcoinCashTx,
    decoded,
    bytes,
    coinbase,
  };
};
