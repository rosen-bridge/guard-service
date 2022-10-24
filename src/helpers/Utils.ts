import { Buffer } from 'buffer';
import Encryption from './Encryption';

class Utils {
  /**
   * converts number to 1 byte Uint8Array
   * @param num
   */
  static numberToByte = (num: number): Uint8Array => {
    const buffer = Buffer.alloc(1, 0);
    buffer.writeUint8(num);
    return buffer;
  };

  /**
   * converts hex string to bytearray
   */
  static hexStringToUint8Array = (str: string): Uint8Array => {
    return Buffer.from(str, 'hex');
  };

  /**
   * converts bytearray to hex string
   */
  static Uint8ArrayToHexString = (bytes: Uint8Array): string => {
    return Buffer.from(bytes).toString('hex');
  };

  /**
   * converts base64 string to bytearray
   */
  static base64StringToUint8Array = (str: string): Uint8Array => {
    return Buffer.from(str, 'base64');
  };

  /**
   * converts bytearray to base64 string
   */
  static uint8ArrayToBase64String = (bytes: Uint8Array): string => {
    return Buffer.from(bytes).toString('base64');
  };

  /**
   * converts bytearray to base64 string
   */
  static Uint8ArrayToBase64String = (bytes: Uint8Array): string => {
    return Buffer.from(bytes).toString('base64');
  };

  /**
   * converts sourceTxId to eventId (calculates blake2b hash of it)
   * @param txId
   */
  static txIdToEventId = (txId: string): string => {
    return Buffer.from(Encryption.blake2bHash(txId)).toString('hex');
  };

  /**
   * returns maximum value between two bigint
   * @param a bigint number
   * @param b bigint number
   */
  static maxBigint = (a: bigint, b: bigint): bigint => {
    if (a > b) return a;
    else return b;
  };
}

export default Utils;
