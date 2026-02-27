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
