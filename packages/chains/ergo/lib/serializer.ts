import * as wasm from 'ergo-lib-wasm-nodejs';

class Serializer {
  /**
   * converts the transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @returns bytearray representation of the transaction
   */
  static serialize = (tx: wasm.ReducedTransaction): Uint8Array => {
    return tx.sigma_serialize_bytes();
  };

  /**
   * converts bytearray representation of the unsigned transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction model in the chain library
   */
  static deserialize = (txBytes: Uint8Array): wasm.ReducedTransaction => {
    return wasm.ReducedTransaction.sigma_parse_bytes(txBytes);
  };

  /**
   * converts the signed transaction model in the chain to bytearray
   * @param tx the transaction model in the chain library
   * @returns bytearray representation of the transaction
   */
  static signedSerialize = (tx: wasm.Transaction): Uint8Array => {
    return tx.sigma_serialize_bytes();
  };

  /**
   * converts bytearray representation of the signed transaction to the transaction model in the chain
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction model in the chain library
   */
  static signedDeserialize = (txBytes: Uint8Array): wasm.Transaction => {
    return wasm.Transaction.sigma_parse_bytes(txBytes);
  };
}

export default Serializer;
