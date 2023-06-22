import chainHandler from '../../src/handlers/ChainHandler';
import { AbstractChain } from '@rosen-chains/abstract-chain';
import { AbstractErgoNetwork, ErgoChain } from '@rosen-chains/ergo';

export const chainHandlerInstance = {
  getChain: (chainName: string): AbstractChain => {
    throw Error(`ChainHandler 'getChain' is not mocked!`);
  },
  getErgoChain: (): ErgoChain => {
    throw Error(`ChainHandler 'getErgoChain' is not mocked!`);
  },
  getErgoNetwork: (): AbstractErgoNetwork => {
    throw Error(`ChainHandler 'getErgoNetwork' is not mocked!`);
  },
  getCardanoNetwork: (): AbstractErgoNetwork => {
    throw Error(`ChainHandler 'getCardanoNetwork' is not mocked!`);
  },
};

class ChainHandlerMock {
  private static fromChainName = 'fromChain';
  private static mockedFromChain: Record<string, any>;
  private static toChainName = 'toChain';
  private static mockedToChain: Record<string, any>;
  private static mockedErgo: Record<string, any>;

  /**
   * mocks getChain function of ChainHandler
   */
  private static mockGetChain = () => {
    vi.spyOn(chainHandlerInstance, 'getChain').mockImplementation(
      (chainName: string) => {
        if (chainName === 'ergo')
          return this.mockedErgo as unknown as AbstractChain;
        else if (chainName === this.fromChainName)
          return this.mockedFromChain as unknown as AbstractChain;
        else if (chainName === this.toChainName)
          return this.mockedToChain as unknown as AbstractChain;
        else
          throw Error(
            `Cannot get mocked chain: Chain [${chainName}] is not mocked`
          );
      }
    );
  };

  /**
   * resets all mocked functions for mocked chains and renews
   * ChainHandler mock
   */
  static resetMock = () => {
    this.fromChainName = 'fromChain';
    this.mockedFromChain = {};
    this.toChainName = 'toChain';
    this.mockedToChain = {};
    this.mockedErgo = {};

    this.mockGetChain();
    vi.spyOn(chainHandlerInstance, 'getErgoChain').mockReturnValue(
      this.mockedErgo as unknown as ErgoChain
    );
  };

  /**
   * mocks ChainHandler.getChain to return mocked Ergo chain
   * @param chainName new name for mocked chain
   * @param mockFromChain true if mocking fromChain
   */
  static mockChainName = (chainName: string, mockFromChain = false) => {
    if (mockFromChain) this.fromChainName = chainName;
    else this.toChainName = chainName;
    this.mockGetChain();
  };

  /**
   * mocks a function for mocked chain
   * @param name function name
   * @param result function mocked result
   * @param isAsync true if function is async
   */
  static mockFromChainFunction = (
    name: string,
    result: any,
    isAsync = false
  ) => {
    this.mockedFromChain[name] = vi.fn();
    if (isAsync) vi.spyOn(this.mockedFromChain, name).mockResolvedValue(result);
    else vi.spyOn(this.mockedFromChain, name).mockReturnValue(result);
  };

  /**
   * mocks a function for mocked chain
   * @param name function name
   * @param result function mocked result
   * @param isAsync true if function is async
   */
  static mockToChainFunction = (name: string, result: any, isAsync = false) => {
    this.mockedToChain[name] = vi.fn();
    if (isAsync) vi.spyOn(this.mockedToChain, name).mockResolvedValue(result);
    else vi.spyOn(this.mockedToChain, name).mockReturnValue(result);
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
    this.mockedErgo[name] = vi.fn();
    if (isAsync) vi.spyOn(this.mockedErgo, name).mockResolvedValue(result);
    else vi.spyOn(this.mockedErgo, name).mockReturnValue(result);
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
    this.mockedErgo[name] = vi.fn();
    if (isAsync)
      vi.spyOn(this.mockedErgo, name).mockImplementation(async () => {
        throw error;
      });
    else
      vi.spyOn(this.mockedErgo, name).mockImplementation(() => {
        throw error;
      });
  };

  /**
   * mocks ChainHandler.getErgoNetwork to run the impl function
   * @param impl
   * @param isAsync
   */
  static mockGetErgoNetwork = (impl: any, isAsync = false) => {
    if (isAsync)
      vi.spyOn(chainHandlerInstance, 'getErgoNetwork').mockImplementation(
        async () => {
          return await impl();
        }
      );
    else
      vi.spyOn(chainHandlerInstance, 'getErgoNetwork').mockImplementation(
        () => {
          return impl();
        }
      );
  };

  /**
   * mocks ChainHandler.getCardanoNetwork to run the impl function
   */
  static mockGetCardanoNetwork = (impl: any, isAsync = false) => {
    if (isAsync)
      vi.spyOn(chainHandlerInstance, 'getCardanoNetwork').mockImplementation(
        async () => {
          return await impl();
        }
      );
    else
      vi.spyOn(chainHandlerInstance, 'getCardanoNetwork').mockImplementation(
        () => {
          return impl();
        }
      );
  };
}

export default ChainHandlerMock;
