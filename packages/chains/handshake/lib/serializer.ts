import hsd from 'hsd';
import type { MTX } from 'hsd';

const { MTX: HsdMTX } = hsd;

class Serializer {
  /**
   * converts HSD MTX to bytearray
   * @param tx the transaction in HSD MTX format
   * @returns bytearray representation of the transaction
   */
  static serialize = (tx: MTX): Uint8Array => {
    return tx.toRaw();
  };

  /**
   * converts bytearray representation of the transaction to HSD MTX format
   * @param txBytes bytearray representation of the transaction
   * @returns the transaction in HSD MTX format
   */
  static deserialize = (txBytes: Uint8Array): MTX => {
    return HsdMTX.fromRaw(Buffer.from(txBytes));
  };
}

export default Serializer;
