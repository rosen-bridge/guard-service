import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { HANDSHAKE_CHAIN } from './constants';
import { HandshakeTransactionJsonModel } from './types';

class HandshakeTransaction extends PaymentTransaction {
  inputUtxos: Array<string>;

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    inputUtxos: Array<string>,
  ) {
    super(HANDSHAKE_CHAIN, txId, eventId, txBytes, txType);
    this.inputUtxos = inputUtxos;
  }

  /**
   * converts json representation of the payment transaction to HandshakeTransaction
   * @returns HandshakeTransaction object
   */
  static fromJson = (jsonString: string): HandshakeTransaction => {
    const obj = JSON.parse(jsonString) as HandshakeTransactionJsonModel;
    return new HandshakeTransaction(
      obj.txId,
      obj.eventId,
      Buffer.from(obj.txBytes, 'hex'),
      obj.txType as TransactionType,
      obj.inputUtxos,
    );
  };

  /**
   * converts HandshakeTransaction to json
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

export default HandshakeTransaction;
