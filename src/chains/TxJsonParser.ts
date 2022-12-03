/**
 * reads PaymentTransaction and it's inherited classes from json string
 * @param jsonString
 */
import { PaymentTransaction } from '../models/Models';
import { PaymentTransactionJsonModel } from '../models/Interfaces';
import ChainsConstants from './ChainsConstants';
import ErgoTransaction from './ergo/models/ErgoTransaction';
import { ChainNotImplemented } from '../helpers/errors';

export const txJsonParser = (jsonString: string): PaymentTransaction => {
  const chain = (JSON.parse(jsonString) as PaymentTransactionJsonModel).network;
  if (chain === ChainsConstants.cardano) {
    return PaymentTransaction.fromJson(jsonString);
  } else if (chain === ChainsConstants.ergo) {
    return ErgoTransaction.fromJson(jsonString);
  } else throw new ChainNotImplemented(chain);
};
