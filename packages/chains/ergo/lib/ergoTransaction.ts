import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from './constants';
import { ErgoTransactionJsonModel } from './types';

class ErgoTransaction extends PaymentTransaction {
  inputBoxes: Array<Uint8Array>;
  dataInputs: Array<Uint8Array>;

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    inputBoxes: Array<Uint8Array>,
    dataInputs: Array<Uint8Array>
  ) {
    super(ERGO_CHAIN, txId, eventId, txBytes, txType);
    this.inputBoxes = inputBoxes;
    this.dataInputs = dataInputs;
  }

  /**
   * converts json representation of the payment transaction to ErgoTransaction
   * @returns ErgoTransaction object
   */
  static fromJson = (jsonString: string): ErgoTransaction => {
    const obj = JSON.parse(jsonString) as ErgoTransactionJsonModel;
    return new ErgoTransaction(
      obj.txId,
      obj.eventId,
      Buffer.from(obj.txBytes, 'hex'),
      obj.txType as TransactionType,
      obj.inputBoxes.map((box) => Buffer.from(box, 'hex')),
      obj.dataInputs.map((box) => Buffer.from(box, 'hex'))
    );
  };

  /**
   * converts ErgoTransaction to json
   * @returns json representation of the payment transaction
   */
  toJson = (): string => {
    return JSON.stringify({
      network: this.network,
      txId: this.txId,
      eventId: this.eventId,
      txBytes: this.getTxHexString(),
      txType: this.txType,
      inputBoxes: this.getInputBoxesString(),
      dataInputs: this.getDataInputsString(),
    });
  };

  /**
   * @returns transaction hex string
   */
  getTxHexString = () => {
    return Buffer.from(this.txBytes).toString('hex');
  };

  /**
   * @returns list of inputBoxes serialized bytes in hex string
   */
  getInputBoxesString = (): Array<string> => {
    return this.inputBoxes.map((box) => Buffer.from(box).toString('hex'));
  };

  /**
   * @returns list of dataInput boxes serialized bytes in hex string
   */
  getDataInputsString = (): Array<string> => {
    return this.dataInputs.map((box) => Buffer.from(box).toString('hex'));
  };
}

export default ErgoTransaction;
