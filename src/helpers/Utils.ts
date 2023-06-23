import { Buffer } from 'buffer';

import { get, set } from 'lodash-es';

import Encryption from './Encryption';

import { JsonBI } from '../network/NetworkModels';
import {
  DerivationPath,
  ExtSecretKey,
  Mnemonic,
  SecretKey,
} from 'ergo-lib-wasm-nodejs';

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
   * converts mnemonic to secret key using Ergo wasm and EIP-003
   * @param mnemonic
   */
  static convertMnemonicToSecretKey = (mnemonic: string): string => {
    const seed = Mnemonic.to_seed(mnemonic, '');
    const rootSecret = ExtSecretKey.derive_master(seed);
    const changePath = DerivationPath.new(0, new Uint32Array([0]));
    const secretKeyBytes = rootSecret.derive(changePath).secret_key_bytes();
    return Buffer.from(
      SecretKey.dlog_from_bytes(secretKeyBytes).to_bytes()
    ).toString('hex');
  };
}

export default Utils;
