import { TransactionType } from './types';

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
    txType: TransactionType,
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
  toJson = (): string => {
    const obj = {
      network: this.network,
      eventId: this.eventId,
      txBytes: Buffer.from(this.txBytes).toString('hex'),
      txId: this.txId,
      txType: this.txType,
    };
    return JSON.stringify(obj, Object.keys(obj).sort());
  };
}

export default PaymentTransaction;
