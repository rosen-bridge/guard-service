import bs58check from 'bs58check';
import { createHash } from 'crypto';

import {
  parseBlockHeader as parseScannerBlockHeader,
  parseTransaction,
} from '@rosen-bridge/firo-scanner/dist/network/parsers';
import { BlockInfo } from '@rosen-chains/abstract-chain';
import { FiroTx, FIRO_NETWORK } from '@rosen-chains/firo';

// Current Firo prefixes plus legacy D-address P2PKH used by Rosen configs.
const FIRO_P2PKH_PREFIXES = new Set([
  0x1e,
  0x41,
  0x42,
  FIRO_NETWORK.pubKeyHash,
]);
const FIRO_P2SH_PREFIXES = new Set([FIRO_NETWORK.scriptHash, 0xb2, 0xb3]);
const FIRO_DECIMALS = 8;
const FIRO_FACTOR = 100000000n;

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
 * Converts a Firo base58 address into an ElectrumX scripthash.
 * @param address Firo P2PKH or P2SH address
 * @returns ElectrumX-compatible script hash
 */
export const addressToScripthash = (address: string): string => {
  const payload = Buffer.from(bs58check.decode(address));
  if (payload.length !== 21) {
    throw new Error(`Invalid Firo address length: ${payload.length}`);
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
 * Converts a decimal FIRO amount to satoshis using a normalized decimal string.
 * @param value FIRO amount from scanner parser
 * @returns amount in satoshis
 */
const firoAmountToSatoshi = (value: number | string): bigint => {
  const decimal =
    typeof value === 'number' ? value.toFixed(FIRO_DECIMALS) : value;
  const [integerPart, fractionPart = ''] = decimal.split('.');
  const normalizedFraction = fractionPart
    .padEnd(FIRO_DECIMALS, '0')
    .slice(0, FIRO_DECIMALS);

  return BigInt(integerPart) * FIRO_FACTOR + BigInt(normalizedFraction);
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
      value: firoAmountToSatoshi(output.value),
      scriptPubKey: output.scriptPubKey.hex,
    })),
  };
};
