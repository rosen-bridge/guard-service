import { SerializationError } from '@rosen-chains/abstract-chain';
import { Transaction } from 'ethers';

class Serializer {
  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @returns bytearray representation of the transaction
   */
  static serialize = (tx: Transaction): Uint8Array => {
    try {
      return Uint8Array.from(
        Buffer.from(tx.unsignedSerialized.substring(2), 'hex')
      );
    } catch (error) {
      throw new SerializationError(`${error}`);
    }
  };

  /**
   * converts bytearray representation of the transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction model in the chain library
   */
  static deserialize = (txBytes: Uint8Array): Transaction => {
    try {
      return Transaction.from('0x' + Buffer.from(txBytes).toString('hex'));
    } catch (error) {
      throw new SerializationError(`${error}`);
    }
  };

  /**
   * converts the signed transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @returns bytearray representation of the transaction
   */
  static signedSerialize = (tx: Transaction): Uint8Array => {
    try {
      return Uint8Array.from(Buffer.from(tx.serialized.substring(2), 'hex'));
    } catch (error) {
      throw new SerializationError(`${error}`);
    }
  };
}

export default Serializer;
