import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { DOGE_CHAIN } from './constants';
// Ensure you define DOGE_CHAIN in your constants file
import { DogeTransactionJsonModel } from './types';

class DogeTransaction extends PaymentTransaction {
  inputUtxos: Array<string>;

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    inputUtxos: Array<string>,
  ) {
    super(DOGE_CHAIN, txId, eventId, txBytes, txType);
    this.inputUtxos = inputUtxos;
  }

  /**
   * converts json representation of the payment transaction to DogeTransaction
   * @returns DogeTransaction object
   */
  static fromJson = (jsonString: string): DogeTransaction => {
    const obj = JSON.parse(jsonString) as DogeTransactionJsonModel;
    return new DogeTransaction(
      obj.txId,
      obj.eventId,
      Buffer.from(obj.txBytes, 'hex'),
      obj.txType as TransactionType,
      obj.inputUtxos,
    );
  };

  /**
   * converts DogeTransaction to json
   * @returns json representation of the payment transaction
   */
  toJson = (): string => {
    return JSON.stringify({
      network: this.network,
      eventId: this.eventId,
      txBytes: this.getTxHexString(),
      txId: this.txId,
      txType: this.txType,
      inputUtxos: this.inputUtxos,
    });
  };

  /**
   * @returns transaction hex string
   */
  getTxHexString = () => {
    return Buffer.from(this.txBytes).toString('hex');
  };
}

export default DogeTransaction;
