import {
  binToHex,
  encodeTransactionBCH,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import {
  buildBchSignedTransaction,
  decodeBchTransaction,
  getBchSigningDigest,
} from '../lib/bitcoinCashUtils';
import { BitcoinCashPrevout, BitcoinCashRawTransaction } from '../lib/types';
import {
  privateKeyHex,
  publicKey,
  treasuryScript,
  unsignedHex,
  parentId,
  parentHex,
} from './bitcoinCashTestData';

/** Synthetic scalar-1 key bytes for deterministic signing. */
export const privateKey = hexToBin(privateKeyHex);

/**
 * Apply an isolated body fault to the fixed unsigned vector.
 * @param change - Mutation applied after decoding a fresh fixture copy
 * @returns Canonical bytes encoding the altered body
 */
export const mutate = (change: (tx: BitcoinCashRawTransaction) => void) => {
  const tx = decodeBchTransaction(unsigned());
  change(tx);
  return encodeTransactionBCH(tx);
};
/**
 * Compute the ForkID digest for an ordered input of the fixed vector.
 * @param index - Input index in the two-input fixture
 * @returns The signing message hash
 */
export const digest = (index: number) =>
  getBchSigningDigest(unsigned(), prevouts(), treasuryScript, index);
/**
 * Sign both ordered fixed-vector digests with the synthetic private key.
 * @returns Canonical compact signature hex for each input
 */
export const signatures = () =>
  [0, 1].map((index) => {
    const result = secp256k1.signMessageHashCompact(privateKey, digest(index));
    if (typeof result === 'string') throw Error(result);
    return binToHex(result);
  });
/**
 * Finalize the fixed unsigned vector with valid P2PKH ECDSA witnesses.
 * @returns Canonical signed bytes retaining the approved body
 */
export const signed = () =>
  buildBchSignedTransaction(unsigned(), prevouts(), publicKey, signatures());

/**
 * Read a fresh copy of the fixed independently serialized unsigned vector.
 * @returns Canonical two-input transaction bytes
 */
export const unsigned = () => hexToBin(unsignedHex);
/**
 * Build fresh prevout context for the two ordered fixed-vector inputs.
 * @returns Native values, treasury scripts and independently serialized parent bytes
 */
export const prevouts = (): BitcoinCashPrevout[] =>
  [50_000n, 40_000n].map((value, index) => ({
    txId: parentId,
    index,
    value,
    scriptPubKey: treasuryScript,
    parentTransactionHex: parentHex,
  }));
