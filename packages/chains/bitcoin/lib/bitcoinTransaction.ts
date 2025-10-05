import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { BITCOIN_CHAIN } from './constants';
import { BitcoinTransactionJsonModel } from './types';

class BitcoinTransaction extends PaymentTransaction {
  inputUtxos: Array<string>;

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    inputUtxos: Array<string>
  ) {
    super(BITCOIN_CHAIN, txId, eventId, txBytes, txType);
    this.inputUtxos = inputUtxos;
  }

  /**
   * converts json representation of the payment transaction to BitcoinTransaction
   * @returns BitcoinTransaction object
   */
  static fromJson = (jsonString: string): BitcoinTransaction => {
    const obj = JSON.parse(jsonString) as BitcoinTransactionJsonModel;
    return new BitcoinTransaction(
      obj.txId,
      obj.eventId,
      Buffer.from(obj.txBytes, 'hex'),
      obj.txType as TransactionType,
      obj.inputUtxos
    );
  };

  /**
   * converts BitcoinTransaction to json
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

export default BitcoinTransaction;
