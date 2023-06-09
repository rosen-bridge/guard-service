import { PaymentTransaction } from '../models/Models';
import { PaymentTransactionJsonModel } from '../models/Interfaces';
import ChainsConstants from './ChainsConstants';
import ErgoTransaction from './ergo/models/ErgoTransaction';
import { ChainNotImplemented } from '../helpers/errors';
import * as RosenChains from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import * as ErgoChainPackage from '@rosen-chains/ergo';

/**
 * reads PaymentTransaction and it's inherited classes from json string
 * @param jsonString
 */
export const txJsonParser = (
  jsonString: string
): RosenChains.PaymentTransaction => {
  const chain = (JSON.parse(jsonString) as PaymentTransactionJsonModel).network;
  if (chain === ChainsConstants.cardano) {
    return PaymentTransaction.fromJson(jsonString);
  } else if (chain === ChainsConstants.ergo) {
    return ErgoTransaction.fromJson(jsonString);
  } else throw new ChainNotImplemented(chain);
};

/**
 * TODO: at the end of refactor, this function should not be used. remove it (#195)
 * converts abstract-chain PaymentTransaction model to previous version of it in guard
 * @param paymentTransaction
 */
export const paymentTransactionTypeChange = (
  paymentTx: RosenChains.PaymentTransaction
): PaymentTransaction => {
  if (paymentTx.network === ERGO_CHAIN)
    return new ErgoTransaction(
      paymentTx.txId,
      paymentTx.eventId,
      paymentTx.txBytes,
      (paymentTx as ErgoChainPackage.ErgoTransaction).inputBoxes,
      (paymentTx as ErgoChainPackage.ErgoTransaction).dataInputs,
      paymentTx.txType
    );
  else
    return new PaymentTransaction(
      paymentTx.network,
      paymentTx.txId,
      paymentTx.eventId,
      paymentTx.txBytes,
      paymentTx.txType
    );
};
