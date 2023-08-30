import { Mock } from 'vitest';
import Notification from '../../../../src/communication/notification/Notification';
import { WebhookClient } from 'discord.js';

class NotificationMock {
  private static mockedNotification: Record<string, any>;
  private static mockedWebhookClient: Record<string, any>;

  /**
   * resets all mocked functions of txAgreement
   */
  static resetMock = () => {
    this.mockedNotification = {};
    this.mockedWebhookClient = {};
  };

  /**
   * mocks Notification.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(Notification, 'getInstance');
    functionSpy.mockReturnValue(this.mockedNotification as Notification);
  };

  /**
   * mocks WebhookClient
   */
  static getWebhookClient = (): WebhookClient => {
    return this.mockedWebhookClient as WebhookClient;
  };

  /**
   * mocks WebhookClient.send
   */
  static mockSendMethodOfWebhookClient = () => {
    this.mockedWebhookClient.send = vi.fn();
    this.mockedWebhookClient.send.mockResolvedValue(null);
  };

  /**
   * mocks Notification.sendMessage
   */
  static mockSendMessage = () => {
    this.mockedNotification.sendMessage = vi.fn();
    this.mockedNotification.sendMessage.mockImplementation(() => null);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getNotificationMockedFunction = (name: string): Mock<any, any> => {
    return this.mockedNotification[name];
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  static getWebhookClientMockedFunction = (name: string): Mock<any, any> => {
    return this.mockedWebhookClient[name];
  };
}

export default NotificationMock;
