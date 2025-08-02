import { Mock } from 'vitest';
import BalanceHandler from '../../../src/handlers/BalanceHandler';

class BalanceHandlerMock {
  private static mockedBalanceHandler: Record<string, any>;

  /**
   * resets all mocked functions of BalanceHandler
   */
  static resetMock = () => {
    this.mockedBalanceHandler = {};
  };

  /**
   * mocks BalanceHandler.getInstance to return mocked object
   */
  static mock = () => {
    return vi
      .spyOn(BalanceHandler, 'getInstance')
      .mockReturnValue(this.mockedBalanceHandler as BalanceHandler);
  };

  /**
   * mocks BalanceHandler.getAddressAssets
   */
  static mockGetAddressAssets = () => {
    this.mockedBalanceHandler.getAddressAssets = vi.fn();
    return vi
      .spyOn(this.mockedBalanceHandler, 'getAddressAssets')
      .mockImplementation(() => null);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getMockedFunction = (name: string): Mock<any> => {
    return this.mockedBalanceHandler[name];
  };
}

export default BalanceHandlerMock;
