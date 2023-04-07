import { AbstractChain } from '@rosen-chains/abstract-chain';

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
}

export default ChainHandler;
