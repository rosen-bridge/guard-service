import { Psbt } from 'bitcoinjs-lib';

class Serializer {
  /**
   * converts 'bitcoinjs-lib' PSBT to bytearray
   * @param tx the transaction in 'bitcoinjs-lib' PSBT format
   * @returns bytearray representation of the transaction
   */
  static serialize = (tx: Psbt): Uint8Array => {
    return tx.toBuffer();
  };

  /**
   * converts bytearray representation of the transaction to 'bitcoinjs-lib' PSBT format
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction in 'bitcoinjs-lib' PSBT format
   */
  static deserialize = (txBytes: Uint8Array): Psbt => {
    return Psbt.fromBuffer(Buffer.from(txBytes));
  };
}

export default Serializer;
