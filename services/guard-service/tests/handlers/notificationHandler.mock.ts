import { Mock } from 'vitest';

import { NotificationHandler } from '../../src/handlers/notificationHandler';

class NotificationHandlerMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mockedNotificationHandler: Record<string, any>;

  /**
   * resets all mocked functions of notification
   */
  static resetMock = () => {
    this.mockedNotificationHandler = {};
  };

  /**
   * mocks NotificationHandler.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(NotificationHandler, 'getInstance');
    functionSpy.mockReturnValue(
      this.mockedNotificationHandler as NotificationHandler,
    );
  };

  /**
   * mocks NotificationHandler.notify
   */
  static mockNotify = () => {
    this.mockedNotificationHandler.notify = vi.fn();
    this.mockedNotificationHandler.notify.mockImplementation(() => null);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getNotificationHandlerMockedFunction = (name: string): Mock<any> => {
    return this.mockedNotificationHandler[name];
  };
}

export default NotificationHandlerMock;
