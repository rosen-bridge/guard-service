import { blake2b } from 'blakejs';
import { Buffer } from 'buffer';
import { DerivationPath, ExtSecretKey, Mnemonic } from 'ergo-lib-wasm-nodejs';

import { EventTrigger } from '@rosen-chains/abstract-chain';

import { RevenuePeriod } from './constants';

class Utils {
  /**
   * converts sourceTxId to eventId (calculates blake2b hash of it)
   * @param txId
   */
  static txIdToEventId = (txId: string): string => {
    return Buffer.from(blake2b(txId, undefined, 32)).toString('hex');
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

  /**
   * converts timestamp to label based on the given period
   *
   * this is essential to create a consistence revenue chart
   * @param timestamp in seconds
   * @param period year, month or week
   * @returns label in milliseconds
   */
  static convertTimestampToLabel = (
    timestamp: number,
    period: RevenuePeriod,
  ): number => {
    const date = new Date(timestamp * 1000);
    date.setUTCHours(0);
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    switch (period) {
      case RevenuePeriod.year: {
        date.setUTCMonth(0);
        date.setUTCDate(1);
        break;
      }
      case RevenuePeriod.month: {
        date.setUTCDate(1);
        break;
      }
      case RevenuePeriod.week: {
        date.setUTCDate(date.getUTCDate() - date.getUTCDay());
        break;
      }
    }
    return date.getTime();
  };
}

export default Utils;
