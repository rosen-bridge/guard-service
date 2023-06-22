import { Buffer } from 'buffer';

import { get, set } from 'lodash-es';

import Encryption from './Encryption';

import { JsonBI } from '../network/NetworkModels';
import { TokenInfo } from '@rosen-chains/abstract-chain';

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

  /**
   * Works like `JSON.parse`, but converts all paths in `forceBigIntPaths` to
   * bigint (if possible, otherwise leaves the value as-is)
   *
   * @param string String to parse
   * @param forceBigIntPaths Array of all paths that should be converted to bigint
   * @returns parsed value
   */
  static parseJson = (string: string, forceBigIntPaths: string[] = []) => {
    const parsedString = JSON.parse(string);
    const allBigIntsParsedString = JsonBI.parse(string);

    forceBigIntPaths.forEach((path) => {
      set(parsedString, path, get(allBigIntsParsedString, path));
    });

    return parsedString;
  };

  /**
   * Extracts top tokens from a list of tokens
   * @param tokens
   * @param count the number of tokens to extract
   */
  static extractTopTokens = (tokens: TokenInfo[], count: number) => {
    let topTokens = tokens.sort((a, b) => {
      if (a.value > b.value) return -1;
      else if (a.value < b.value) return 1;
      else return 0;
    });

    topTokens = topTokens.slice(0, count);

    const result = topTokens.map((token) => {
      return {
        ...token,
        value: token.value.toString(),
      };
    });

    return result;
  };
}

export default Utils;
