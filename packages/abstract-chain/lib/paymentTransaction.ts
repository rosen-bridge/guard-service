import { TransactionType } from './types';
import JsonBigInt from '@rosen-bridge/json-bigint';

class PaymentTransaction {
  network: string;
  txId: string;
  eventId: string;
  txBytes: Uint8Array;
  txType: TransactionType;

  constructor(
    chain: string,
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType
  ) {
    this.network = chain;
    this.eventId = eventId;
    this.txBytes = txBytes;
    this.txId = txId;
    this.txType = txType;
  }

  /**
   * converts PaymentTransaction to json
   * @returns json representation of the payment transaction
   */
  toJson = (): string =>
    JsonBigInt.stringify({
      network: this.network,
      eventId: this.eventId,
      txBytes: Buffer.from(this.txBytes).toString('hex'),
      txId: this.txId,
      txType: this.txType,
    });
}

export default PaymentTransaction;
