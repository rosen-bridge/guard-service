import { blake2b } from 'blakejs';
import { Buffer } from 'buffer';

import {
  AbstractChain,
  PaymentTransaction,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

/**
 * converts json string to PaymentTransaction
 * @param jsonString
 * @param getChain the `ChainHandler.getChain` function
 * @returns
 */
export const fromJson = (
  jsonString: string,
  getChain: (chain: string) => AbstractChain<unknown>,
): PaymentTransaction => {
  const network = (JSON.parse(jsonString) as PaymentTransactionJsonModel)
    .network;
  return getChain(network).PaymentTransactionFromJson(jsonString);
};

/**
 * calculates hash of the serialized string of a PaymentTransaction
 * used to bind an agreement signature to the exact transaction content
 * (network, eventId, txBytes, txId and txType), rather than to its txId alone
 * @param tx
 * @returns hex representation of the blake2b hash of tx's json
 */
export const getTxDataHash = (tx: PaymentTransaction): string =>
  Buffer.from(blake2b(tx.toJson(), undefined, 32)).toString('hex');
