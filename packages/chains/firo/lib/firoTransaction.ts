import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { FIRO_CHAIN } from './constants';
import { FiroTransactionJsonModel } from './types';

class FiroTransaction extends PaymentTransaction {
  inputUtxos: Array<string>;

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    inputUtxos: Array<string>,
  ) {
    super(FIRO_CHAIN, txId, eventId, txBytes, txType);
    this.inputUtxos = inputUtxos;
  }

  /**
   * converts json representation of the payment transaction to FiroTransaction
   * @returns FiroTransaction object
   */
  static fromJson = (jsonString: string): FiroTransaction => {
    const obj = JSON.parse(jsonString) as FiroTransactionJsonModel;
    const txBuffer = Buffer.from(obj.txBytes, 'hex');
    return new FiroTransaction(
      obj.txId,
      obj.eventId,
      new Uint8Array(txBuffer),
      obj.txType as TransactionType,
      obj.inputUtxos,
    );
  };

  /**
   * converts FiroTransaction to json
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

export default FiroTransaction;
