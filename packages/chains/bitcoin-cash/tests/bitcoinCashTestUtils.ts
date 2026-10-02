import { binToHex, encodeTransactionBCH, secp256k1 } from '@bitauth/libauth';

import {
  buildBchSignedTransaction,
  decodeBchTransaction,
  getBchSigningDigest,
} from '../lib/bitcoinCashUtils';
import { BitcoinCashRawTransaction } from '../lib/types';
import {
  unsigned,
  prevouts,
  privateKey,
  publicKey,
  treasuryScript,
} from './fixtures';

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
