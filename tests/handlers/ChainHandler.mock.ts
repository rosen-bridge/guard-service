import { AbstractChain } from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ErgoChain, ERGO_CHAIN } from '@rosen-chains/ergo';
import { Mock } from 'vitest';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';

export const chainHandlerInstance = {
  getChain: (chainName: string): AbstractChain<any> => {
    throw Error(`ChainHandler 'getChain' is not mocked!`);
  },
  getErgoChain: (): ErgoChain => {
    throw Error(`ChainHandler 'getErgoChain' is not mocked!`);
  },
  getRequiredConfirmation: (chain: string, type: string): number => {
    throw Error(`ChainHandler 'getRequiredConfirmation' is not mocked!`);
  },
  getChainColdAddress: (chain: string): string => {
    throw Error(`ChainHandler 'getChainColdAddress' is not mocked!`);
  },
  getChainPermitAddress: (chain: string): string => {
    switch (chain) {
      case CARDANO_CHAIN:
        return GuardsCardanoConfigs.cardanoContractConfig.permitAddress;
      default:
        return GuardsErgoConfigs.ergoContractConfig.permitAddress;
    }
  },
};

class ChainHandlerMock {
  private static mockedChains = new Map<string, Record<string, any>>();

  /**
   * gets mocked chain object by chain name
   * @param chainName
   */
  private static getMockedChain = (chainName: string) => {
    const chain = this.mockedChains.get(chainName);
    if (chain === undefined)
      throw Error(
        `Cannot get mocked chain: Chain [${chainName}] is not mocked`
      );
    else return chain;
  };

  /**
   * resets all mocked functions for mocked chains and renews
   * ChainHandler mock
   */
  static resetMock = () => {
    this.mockedChains.clear();

    vi.spyOn(chainHandlerInstance, 'getChain').mockImplementation(
      (chainName: string) => {
        const chain = this.mockedChains.get(chainName);
        if (chain) return chain as unknown as AbstractChain<any>;
        else
          throw Error(
            `Cannot get mocked chain: Chain [${chainName}] is not mocked`
          );
      }
    );
    this.mockChainName(ERGO_CHAIN);
    vi.spyOn(chainHandlerInstance, 'getErgoChain').mockReturnValue(
      this.getMockedChain(ERGO_CHAIN) as unknown as ErgoChain
    );
  };

  /**
   * mocks ChainHandler.getChain to return mocked Ergo chain
   * @param chainName new name for mocked chain
   * @param mockFromChain true if mocking fromChain
   */
  static mockChainName = (chainName: string) => {
    const chain = {};
    this.mockedChains.set(chainName, chain);
  };

  /**
   * mocks a function for mocked chain
   * @param chainName mocked chain name
   * @param name function name
   * @param result function mocked result
   * @param isAsync true if function is async
   */
  static mockChainFunction = (
    chainName: string,
    name: string,
    result: any,
    isAsync = false
  ) => {
    const chain = this.getMockedChain(chainName);
    chain[name] = vi.fn();
    if (isAsync) vi.spyOn(chain, name).mockResolvedValue(result);
    else vi.spyOn(chain, name).mockReturnValue(result);
  };

  /**
   * mocks a function for mocked chain to throw `error`
   * @param chainName mocked chain name
   * @param name function name
   * @param result an error object
   * @param isAsync true if function is async
   */
  static mockChainFunctionToThrow = (
    chainName: string,
    name: string,
    error: any,
    isAsync = false
  ) => {
    const chain = this.getMockedChain(chainName);
    chain[name] = vi.fn();
    if (isAsync)
      vi.spyOn(chain, name).mockImplementation(async () => {
        throw error;
      });
    else
      vi.spyOn(chain, name).mockImplementation(() => {
        throw error;
      });
  };

  /**
   * returns a mocked function object
   * @param chainName mocked chain name
   * @param name function name
   */
  static getChainMockedFunction = (
    chainName: string,
    name: string
  ): Mock<any> => {
    return this.getMockedChain(chainName)[name];
  };

  /**
   * returns a mocked function object
   * @param name function name
   */
  static getErgoMockedFunction = (name: string): Mock<any> => {
    return this.getMockedChain(ERGO_CHAIN)[name];
  };

  /**
   * mocks a function for mocked Ergo chain to reutrn `result`
   * @param name function name
   * @param result function mocked result
   * @param isAsync true if function is async
   */
  static mockErgoFunctionReturnValue = (
    name: string,
    result: any,
    isAsync = false
  ) => {
    this.mockChainFunction(ERGO_CHAIN, name, result, isAsync);
  };

  /**
   * mocks a function for mocked Ergo chain to throw `error`
   * @param name function name
   * @param result an error object
   * @param isAsync true if function is async
   */
  static mockErgoFunctionToThrow = (
    name: string,
    error: any,
    isAsync = false
  ) => {
    this.mockChainFunctionToThrow(ERGO_CHAIN, name, error, isAsync);
  };
}

export default ChainHandlerMock;
