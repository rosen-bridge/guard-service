import {
  PaymentTransaction,
  PaymentTransactionJsonModel,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN, CardanoTransaction } from '@rosen-chains/cardano';
import { ERGO_CHAIN, ErgoTransaction } from '@rosen-chains/ergo';

/**
 * converts json string to PaymentTransaction
 * @param jsonString
 * @returns
 */
export const fromJson = (jsonString: string): PaymentTransaction => {
  const network = (JSON.parse(jsonString) as PaymentTransactionJsonModel)
    .network;
  if (network === ERGO_CHAIN) return ErgoTransaction.fromJson(jsonString);
  else if (network === CARDANO_CHAIN)
    return CardanoTransaction.fromJson(jsonString);
  else {
    const obj = JSON.parse(jsonString) as PaymentTransactionJsonModel;
    return new PaymentTransaction(
      network,
      obj.txId,
      obj.eventId,
      Buffer.from(obj.txBytes, 'hex'),
      obj.txType as TransactionType,
    );
  }
};
