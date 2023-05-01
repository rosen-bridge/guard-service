import { AbstractChain } from '@rosen-chains/abstract-chain';
import { ErgoChain } from '@rosen-chains/ergo';

// TODO: implement functions and use in code (#201)
class ChainHandler {
  /**
   * gets chain object by name
   * @param chain chain name
   * @returns chain object
   */
  static getChain = (chain: string): AbstractChain => {
    throw Error(`Not implemented`);
  };

  /**
   * gets ergo chain object
   * @returns chain object
   */
  static getErgoChain = (): ErgoChain => {
    throw Error(`Not implemented`);
  };
}

export default ChainHandler;
