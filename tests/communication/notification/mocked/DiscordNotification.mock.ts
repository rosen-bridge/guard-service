import { Mock } from 'vitest';
import DiscordNotification from '../../../../src/communication/notification/DiscordNotification';

class DiscordNotificationMock {
  private static mockedDiscord: Record<string, any>;

  /**
   * resets all mocked functions of txAgreement
   */
  static resetMock = () => {
    this.mockedDiscord = {};
  };

  /**
   * mocks DiscordNotification.sendMessage
   * @param result
   */
  static mockSendMessage = () => {
    this.mockedDiscord.sendMessage = vi.fn();
    const functionSpy = vi.spyOn(DiscordNotification, 'sendMessage');
    functionSpy.mockImplementation(this.mockedDiscord.sendMessage);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getMockedFunction = (name: string): Mock<any, any> => {
    return this.mockedDiscord[name];
  };
}

export default DiscordNotificationMock;
