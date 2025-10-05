import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

class Serializer {
  /**
   * converts the Cardano Wasm transaction to bytearray
   * @param tx the transaction in the Cardano Wasm format
   * @returns bytearray representation of the transaction
   */
  static serialize = (tx: Transaction): Uint8Array => {
    return tx.to_bytes();
  };

  /**
   * converts bytearray representation of the transaction to the Cardano Wasm transaction format
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction in the Cardano Wasm format
   */
  static deserialize = (txBytes: Uint8Array): Transaction => {
    return Transaction.from_bytes(txBytes);
  };
}

export default Serializer;
