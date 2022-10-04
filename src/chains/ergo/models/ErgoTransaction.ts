import { PaymentTransaction } from '../../../models/Models';
import { ErgoTransactionJsonModel } from './Interfaces';
import ChainsConstants from '../../ChainsConstants';
import Utils from '../../../helpers/Utils';

class ErgoTransaction extends PaymentTransaction {
  inputBoxes: Uint8Array[];
  dataInputs: Uint8Array[];

  constructor(
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    inputBoxes: Uint8Array[],
    dataInputs: Uint8Array[],
    txType: string
  ) {
    super(ChainsConstants.ergo, txId, eventId, txBytes, txType);
    this.inputBoxes = inputBoxes;
    this.dataInputs = dataInputs;
  }

  static fromJson = (jsonString: string): ErgoTransaction => {
    const obj = JSON.parse(jsonString) as ErgoTransactionJsonModel;
    return new ErgoTransaction(
      obj.txId,
      obj.eventId,
      Utils.hexStringToUint8Array(obj.txBytes),
      obj.inputBoxes.map((box) => Utils.hexStringToUint8Array(box)),
      obj.dataInputs.map((box) => Utils.hexStringToUint8Array(box)),
      obj.txType
    );
  };

  /**
   * @return list of inputBoxes serialized bytes in hex string
   */
  getInputBoxesString = (): string[] => {
    return this.inputBoxes.map((box) => Buffer.from(box).toString('hex'));
  };

  /**
   * @return list of dataInput boxes serialized bytes in hex string
   */
  getDataInputsString = (): string[] => {
    return this.dataInputs.map((box) => Buffer.from(box).toString('hex'));
  };

  /**
   * @return json representation of the serialized transaction
   */
  override toJson = (): string => {
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
}

export default ErgoTransaction;
