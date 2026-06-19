import * as crypto from 'crypto';

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

function base58Decode(encoded: string): Buffer {
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
}

export function reverseHex(hex: string): string {
  const buf = Buffer.from(hex, 'hex');
  return buf.reverse().toString('hex');
}

export function doubleSha256(data: Buffer): Buffer {
  return crypto
    .createHash('sha256')
    .update(crypto.createHash('sha256').update(data).digest())
    .digest();
}

function readVarInt(data: Buffer, offset: number): [number, number] {
  const first = data[offset];
  if (first === undefined) throw new Error('Unexpected end of data');
  if (first < 0xfd) return [first, offset + 1];
  if (first === 0xfd) return [data.readUInt16LE(offset + 1), offset + 3];
  if (first === 0xfe) return [data.readUInt32LE(offset + 1), offset + 5];
  return [Number(data.readBigInt64LE(offset + 1)), offset + 9];
}

export function addressToScripthash(address: string): string {
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
}

export function scriptPubKeyToScripthash(scriptPubKey: string): string {
  return reverseHex(
    crypto
      .createHash('sha256')
      .update(Buffer.from(scriptPubKey, 'hex'))
      .digest()
      .toString('hex'),
  );
}

export function parseBlockHeader(headerHex: string, height: number): BlockInfo {
  const headerBytes = Buffer.from(headerHex, 'hex');
  if (headerBytes.length < 80) {
    throw new Error(`Invalid block header length: ${headerBytes.length}`);
  }

  return {
    hash: reverseHex(doubleSha256(headerBytes).toString('hex')),
    parentHash: reverseHex(headerBytes.subarray(4, 36).toString('hex')),
    height,
  };
}

/**
 * Parse a raw Firo transaction hex into a FiroTx object.
 * Firo packs transaction type into the upper 16 bits of the version field.
 */
export function parseTransactionHex(hex: string, txid: string): FiroTx {
  const buf = Buffer.from(hex, 'hex');
  let offset = 0;

  offset += 4;

  const [vinCount, newOffset1] = readVarInt(buf, offset);
  offset = newOffset1;
  const inputs: FiroTx['inputs'] = [];
  for (let i = 0; i < vinCount; i++) {
    const prevTxHash = buf.subarray(offset, offset + 32);
    offset += 32;
    const prevIndex = buf.readUInt32LE(offset);
    offset += 4;
    const [scriptSigLen, scriptOffset] = readVarInt(buf, offset);
    offset = scriptOffset;
    const scriptSig = buf
      .subarray(offset, offset + scriptSigLen)
      .toString('hex');
    offset += scriptSigLen;
    offset += 4;

    const txIdStr = prevTxHash.reverse().toString('hex');
    const isCoinbase =
      txIdStr ===
      '0000000000000000000000000000000000000000000000000000000000000000';
    inputs.push({
      txId: isCoinbase ? '' : txIdStr,
      index: isCoinbase ? -1 : prevIndex,
      scriptPubKey: scriptSig,
    });
  }

  const [voutCount, newOffset2] = readVarInt(buf, offset);
  offset = newOffset2;
  const outputs: FiroTx['outputs'] = [];
  for (let i = 0; i < voutCount; i++) {
    const value = buf.readBigInt64LE(offset);
    offset += 8;
    const [scriptLen, scriptOff] = readVarInt(buf, offset);
    offset = scriptOff;
    const scriptPubKey = buf
      .subarray(offset, offset + scriptLen)
      .toString('hex');
    offset += scriptLen;

    outputs.push({ scriptPubKey, value });
  }

  return { id: txid, inputs, outputs };
}
