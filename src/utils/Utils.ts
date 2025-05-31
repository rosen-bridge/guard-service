import { EventTrigger } from '@rosen-chains/abstract-chain';
import { blake2b } from 'blakejs';
import { Buffer } from 'buffer';
import Encryption from './Encryption';
import { DerivationPath, ExtSecretKey, Mnemonic } from 'ergo-lib-wasm-nodejs';
import IntervalTimer from './IntervalTimer';
import NestedIterator from './NestedIterator';

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

  /**
   * retries execution of the action by the given maximum retry count and waits for the retry timeout if the action fails
   * @param maxTries
   * @param action
   * @param retryTimeoutMs
   * @returns promise of generic T
   */
  static retryUntil = async <T>(
    maxTries: number,
    action: () => Promise<T>,
    retryTimeoutMs = 5000
  ): Promise<T | undefined> => {
    const _maxTries = maxTries > 1 ? maxTries : 1;
    for (let i = 0; i < _maxTries; i += 1) {
      try {
        const result = await action();
        return result;
      } catch (error) {
        if (i < _maxTries - 1) {
          await new Promise((r) => setTimeout(r, retryTimeoutMs));
        } else {
          throw new Error('max retry reached');
        }
      }
    }
  };

  /**
   * executes the iterator at a given interval and resolves after all iterations
   * @param iterator
   * @param runIntervalSeconds
   * @param checkIntervalSeconds
   * @param action
   * @returns promise of void
   */
  static runIntervalIterator = async <T extends any[]>(
    iterator: NestedIterator<T>,
    runIntervalSeconds: number,
    checkIntervalSeconds: number,
    action: (value: any) => Promise<void>
  ) => {
    // return a promise to resolve when iterator is exhausted
    return new Promise<void>((resolve, reject) => {
      let timer: IntervalTimer | undefined = undefined;

      const job = async () => {
        // resolve if the iterator has no more items
        if (!iterator.hasNext()) {
          timer!.stop();
          return resolve();
        }

        // get next value of the iterator
        const { value } = iterator.next();

        try {
          await action(value);
        } catch (error) {
          // when max retry is reached
          return reject(error);
        }
      };

      // timer
      timer = new IntervalTimer(
        runIntervalSeconds * 1000,
        job,
        checkIntervalSeconds * 1000
      );

      // start the timer
      timer.start();
    });
  };
}

export default Utils;
