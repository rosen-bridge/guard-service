import {
  PaymentTransaction,
  PaymentTransactionJsonModel,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN, ErgoTransaction } from '@rosen-chains/ergo';

class TransactionSerializer {
  /**
   * converts PaymentTransaction to json string
   * @param tx
   * @returns
   */
  static toJson = (tx: PaymentTransaction): string => {
    if (tx.network === ERGO_CHAIN) return (tx as ErgoTransaction).toJson();
    else
      return JSON.stringify({
        network: tx.network,
        txId: tx.txId,
        eventId: tx.eventId,
        txBytes: Buffer.from(tx.txBytes).toString('hex'),
        txType: tx.txType,
      });
  };

  /**
   * converts json string to PaymentTransaction
   * @param jsonString
   * @returns
   */
  static fromJson = (jsonString: string): PaymentTransaction => {
    const network = (JSON.parse(jsonString) as PaymentTransactionJsonModel)
      .network;
    if (network === ERGO_CHAIN) return ErgoTransaction.fromJson(jsonString);
    else {
      const obj = JSON.parse(jsonString) as PaymentTransactionJsonModel;
      return {
        txId: obj.txId,
        network: network,
        eventId: obj.eventId,
        txBytes: Buffer.from(obj.txBytes, 'hex'),
        txType: obj.txType as TransactionType,
      };
    }
  };
}

export default TransactionSerializer;
