import { EventTrigger } from '@rosen-chains/abstract-chain';
import { blake2b } from 'blakejs';
import { Buffer } from 'buffer';
import Encryption from './Encryption';
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

  /**
   * returns the decoded bigint input
   * @param num
   */
  static bigIntToUint8Array = (num: bigint) => {
    const b = new ArrayBuffer(8);
    new DataView(b).setBigUint64(0, num);
    return new Uint8Array(b);
  };

  /**
   * create commitment from event data and WID
   * @param event
   * @param WID
   */
  static commitmentFromEvent = (event: EventTrigger, WID: string) => {
    const content = Buffer.concat([
      Buffer.from(event.sourceTxId),
      Buffer.from(event.fromChain),
      Buffer.from(event.toChain),
      Buffer.from(event.fromAddress),
      Buffer.from(event.toAddress),
      Utils.bigIntToUint8Array(BigInt(event.amount)),
      Utils.bigIntToUint8Array(BigInt(event.bridgeFee)),
      Utils.bigIntToUint8Array(BigInt(event.networkFee)),
      Buffer.from(event.sourceChainTokenId),
      Buffer.from(event.targetChainTokenId),
      Buffer.from(event.sourceBlockId),
      Utils.bigIntToUint8Array(BigInt(event.sourceChainHeight)),
      Buffer.from(WID, 'hex'),
    ]);
    return Buffer.from(blake2b(content, undefined, 32)).toString('hex');
  };
}

export default Utils;
