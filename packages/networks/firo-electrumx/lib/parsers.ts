import { createHash } from 'crypto';

import {
  parseBlockHeader as parseScannerBlockHeader,
  parseTransaction,
} from '@rosen-bridge/firo-scanner/dist/network/parsers';
import { BlockInfo } from '@rosen-chains/abstract-chain';
import { FiroTx, FIRO_NETWORK } from '@rosen-chains/firo';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Current Firo prefixes plus legacy D-address P2PKH used by Rosen configs.
const FIRO_P2PKH_PREFIXES = new Set([
  0x1e,
  0x41,
  0x42,
  FIRO_NETWORK.pubKeyHash,
]);
const FIRO_P2SH_PREFIXES = new Set([FIRO_NETWORK.scriptHash, 0xb2, 0xb3]);

/**
 * Decodes a base58 string into raw bytes.
 * @param encoded base58-encoded text
 * @returns decoded bytes
 */
const base58Decode = (encoded: string): Buffer => {
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded[i];
    if (c === undefined) continue;
    let carry = BASE58_ALPHABET.indexOf(c);
    if (carry < 0) throw new Error(`Invalid base58 character: ${c}`);
    for (let j = 0; j < bytes.length; j++) {
      const b = bytes[j];
      if (b === undefined) continue;
      carry += b * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const ch of encoded) {
    if (ch === '1') bytes.push(0);
    else break;
  }

  return Buffer.from(bytes.reverse());
};

/**
 * Reverses the byte order of a hex string.
 * @param hex hex-encoded bytes
 * @returns hex string with bytes reversed
 */
export const reverseHex = (hex: string): string => {
  const buf = Buffer.from(hex, 'hex');
  return buf.reverse().toString('hex');
};

/**
 * Calculates Bitcoin-style double SHA-256.
 * @param data bytes to hash
 * @returns double SHA-256 digest
 */
export const doubleSha256 = (data: Buffer): Buffer => {
  return createHash('sha256')
    .update(createHash('sha256').update(data).digest())
    .digest();
};

/**
 * Converts a Firo base58 address into an ElectrumX scripthash.
 * @param address Firo P2PKH or P2SH address
 * @returns ElectrumX-compatible script hash
 */
export const addressToScripthash = (address: string): string => {
  const decoded = base58Decode(address);
  if (decoded.length !== 25) {
    throw new Error(`Invalid Firo address length: ${decoded.length}`);
  }

  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21);
  const expectedChecksum = doubleSha256(payload).subarray(0, 4);
  if (!checksum.equals(expectedChecksum)) {
    throw new Error('Invalid Firo address checksum');
  }

  const version = payload[0];
  if (version === undefined) {
    throw new Error('Invalid Firo address version');
  }

  const payloadHash = payload.subarray(1);
  let script: Buffer;
  if (FIRO_P2PKH_PREFIXES.has(version)) {
    script = Buffer.concat([
      Buffer.from([0x76, 0xa9, 0x14]),
      payloadHash,
      Buffer.from([0x88, 0xac]),
    ]);
  } else if (FIRO_P2SH_PREFIXES.has(version)) {
    script = Buffer.concat([
      Buffer.from([0xa9, 0x14]),
      payloadHash,
      Buffer.from([0x87]),
    ]);
  } else {
    throw new Error(`Unsupported Firo address version: ${version}`);
  }

  return scriptPubKeyToScripthash(script.toString('hex'));
};

/**
 * Converts a script public key into an ElectrumX scripthash.
 * @param scriptPubKey hex-encoded script public key
 * @returns ElectrumX-compatible script hash
 */
export const scriptPubKeyToScripthash = (scriptPubKey: string): string => {
  return reverseHex(
    createHash('sha256')
      .update(Buffer.from(scriptPubKey, 'hex'))
      .digest()
      .toString('hex'),
  );
};

/**
 * Parses a raw Firo block header into block info without height.
 * @param headerHex hex-encoded block header
 * @returns block hash and parent hash
 */
export const parseBlockHeader = (
  headerHex: string,
): Omit<BlockInfo, 'height'> => {
  const { hash, parentHash } = parseScannerBlockHeader(headerHex);
  return { hash, parentHash };
};

/**
 * Parses a raw Firo transaction hex without assigning a transaction id.
 * @param hex hex-encoded raw transaction
 * @returns Firo transaction inputs and outputs
 */
export const parseTransactionHex = (hex: string): Omit<FiroTx, 'id'> => {
  const tx = parseTransaction(hex);
  return {
    inputs: tx.vin.map((input) => {
      const isCoinbase =
        input.txid ===
        '0000000000000000000000000000000000000000000000000000000000000000';
      return {
        txId: isCoinbase ? '' : input.txid,
        index: isCoinbase ? -1 : input.vout,
        scriptPubKey: input.scriptSig.hex,
      };
    }),
    outputs: tx.vout.map((output) => ({
      value: BigInt(Math.round(output.value * 100000000)),
      scriptPubKey: output.scriptPubKey.hex,
    })),
  };
};
