import { Mock } from 'vitest';
import PublicStatusHandler from '../../../src/handlers/PublicStatusHandler';

class PublicStatusHandlerMock {
  private static mockedPublicStatusHandler: Record<string, any>;

  /**
   * resets all mocked functions of PublicStatusHandler
   */
  static resetMock = () => {
    this.mockedPublicStatusHandler = {};
  };

  /**
   * mocks PublicStatusHandler.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi
      .spyOn(PublicStatusHandler, 'getInstance')
      .mockReturnValue(this.mockedPublicStatusHandler as PublicStatusHandler);
    return functionSpy;
  };

  /**
   * mocks PublicStatusHandler.updatePublicEventStatus
   */
  static mockUpdatePublicEventStatus = () => {
    this.mockedPublicStatusHandler.updatePublicEventStatus = vi.fn();
    const functionSpy = vi
      .spyOn(this.mockedPublicStatusHandler, 'updatePublicEventStatus')
      .mockImplementation(() => null);
    return functionSpy;
  };

  /**
   * mocks PublicStatusHandler.updatePublicTxStatus
   */
  static mockUpdatePublicTxStatus = () => {
    this.mockedPublicStatusHandler.updatePublicTxStatus = vi.fn();
    const functionSpy = vi
      .spyOn(this.mockedPublicStatusHandler, 'updatePublicTxStatus')
      .mockImplementation(() => null);
    return functionSpy;
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getMockedFunction = (name: string): Mock<any> => {
    return this.mockedPublicStatusHandler[name];
  };
}

export default PublicStatusHandlerMock;
