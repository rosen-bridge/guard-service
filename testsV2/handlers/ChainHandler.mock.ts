import chainHandler from '../../src/handlers/ChainHandler';
import { AbstractChain } from '@rosen-chains/abstract-chain';
import { ErgoChain } from '@rosen-chains/ergo';

class ChainHandlerMock {
  private static mockedChain: Record<string, any>;
  private static mockedErgo: Record<string, any>;

  /**
   * resets all mocked functions for mocked chains and renews
   * ChainHandler mock
   */
  static resetMock = () => {
    this.mockedChain = {};
    this.mockedErgo = {};

    vi.spyOn(chainHandler, 'getChain').mockReturnValue(
      this.mockedChain as unknown as AbstractChain
    );
    vi.spyOn(chainHandler, 'getErgoChain').mockReturnValue(
      this.mockedErgo as unknown as ErgoChain
    );
  };

  /**
   * mocks ChainHandler.getChain to return mocked Ergo chain
   */
  static mockGetChainAsErgo = () => {
    this.mockedChain = {};
    vi.spyOn(chainHandler, 'getChain').mockReturnValue(
      this.mockedErgo as unknown as AbstractChain
    );
  };

  /**
   * mocks a function for mocked chain
   * @param name function name
   * @param result function mocked result
   * @param isAsync true if function is async
   */
  static mockChainFunction = (name: string, result: any, isAsync = false) => {
    this.mockedChain[name] = vi.fn();
    if (isAsync) vi.spyOn(this.mockedChain, name).mockReturnValue(result);
    else vi.spyOn(this.mockedChain, name).mockResolvedValue(result);
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
    if (isAsync) vi.spyOn(this.mockedErgo, name).mockReturnValue(result);
    else vi.spyOn(this.mockedErgo, name).mockResolvedValue(result);
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
}

export default ChainHandlerMock;
