import {
  PaymentTransaction,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

import ChainHandler from '../handlers/chainHandler';

/**
 * converts json string to PaymentTransaction
 * @param jsonString
 * @returns
 */
export const fromJson = (jsonString: string): PaymentTransaction => {
  const network = (JSON.parse(jsonString) as PaymentTransactionJsonModel)
    .network;
  return ChainHandler.getInstance()
    .getChain(network)
    .PaymentTransactionFromJson(jsonString);
};
