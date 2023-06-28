import { Buffer } from 'buffer';
import Encryption from './Encryption';
import { TokenInfo } from '@rosen-chains/abstract-chain';
import { DerivationPath, ExtSecretKey, Mnemonic } from 'ergo-lib-wasm-nodejs';

class Utils {
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

  /**
   * converts mnemonic to secret key using Ergo wasm and EIP-003
   * @param mnemonic
   */
  static convertMnemonicToSecretKey = (mnemonic: string): string => {
    const seed = Mnemonic.to_seed(mnemonic, '');
    const rootSecret = ExtSecretKey.derive_master(seed);
    const changePath = DerivationPath.new(0, new Uint32Array([0]));
    const secretKeyBytes = rootSecret.derive(changePath).secret_key_bytes();
    return Buffer.from(secretKeyBytes).toString('hex');
  };
}

export default Utils;
