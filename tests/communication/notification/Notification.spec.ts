import NotificationMock from './mocked/Notification.mock';
import TestNotification from './TestNotification';
import { WebhookClient } from 'discord.js';
import { expect } from 'vitest';

describe('Notification', () => {
  describe('sendMessage', () => {
    let notification: TestNotification;

    beforeEach(async () => {
      NotificationMock.resetMock();
      NotificationMock.mock();
      notification = new TestNotification();
    });

    /**
     * @target Notification.sendMessage should call send method of WebhookClient
     * @dependencies
     * - WebhookClient
     * @scenario
     * - mock WebhookClient
     * - mock send method of WebhookClient
     * - run test
     * - check if function got called
     * @expected
     * - `send` method of WebhookClient should got called
     */
    it('should call send method of WebhookClient', async () => {
      // mock WebhookClient
      (notification as any).hookClient = NotificationMock.getWebhookClient();

      // mock send method of WebhookClient
      NotificationMock.mockSendMethodOfWebhookClient();

      // run test
      const testMsg = 'test';
      await notification.sendMessage(testMsg);

      // WebhookClient `send` should got called
      expect(
        NotificationMock.getWebhookClientMockedFunction('send')
      ).toHaveBeenCalledWith({
        content: testMsg,
      });
    });

    /**
     * @target Notification.sendMessage should not throw exception
     * @dependencies
     * @scenario
     * - run test
     * @expected
     * - after run test should not throw exception
     */
    it('should not throw exception', async () => {
      expect(notification.sendMessage('test')).resolves.toBe(undefined);
    });
  });
});
