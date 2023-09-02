import { Mock } from 'vitest';
import Notification from '../../../../src/communication/notification/Notification';

class NotificationMock {
  private static mockedNotification: Record<string, any>;

  /**
   * resets all mocked functions of notification
   */
  static resetMock = () => {
    this.mockedNotification = {};
  };

  /**
   * mocks Notification.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(Notification, 'getInstance');
    functionSpy.mockReturnValue(this.mockedNotification as Notification);
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
}

export default NotificationMock;
