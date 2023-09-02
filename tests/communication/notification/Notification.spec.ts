import TestNotification from './TestNotification';
import { expect } from 'vitest';

describe('Notification', () => {
  describe('sendMessage', () => {
    let notification: TestNotification;

    beforeEach(async () => {
      notification = new TestNotification();
    });

    /**
     * @target Notification.sendMessage should call send method of WebhookClient
     * @dependencies
     * - WebhookClient
     * @scenario
     * - mock send method of WebhookClient
     * - run test
     * - check if function got called
     * @expected
     * - `send` method of WebhookClient should got called
     */
    it('should call send method of WebhookClient', async () => {
      // mock send method of WebhookClient
      const mockedFunc = notification.mockSendMethodOfWebhookClient();

      // run test
      const testMsg = 'test';
      await notification.sendMessage(testMsg);

      // WebhookClient `send` should got called
      expect(mockedFunc).toHaveBeenCalledWith({
        content: testMsg,
      });
    });

    /**
     * @target Notification.sendMessage should not throw exception
     * @dependencies
     * @scenario
     * - mock hookClient
     * - run test
     * @expected
     * - after run test should not throw exception
     */
    it('should not throw exception', async () => {
      // mock send method of WebhookClient
      notification.mockWebhookClient();
      // run test
      expect(notification.sendMessage('test')).resolves.toBe(undefined);
    });
  });
});
