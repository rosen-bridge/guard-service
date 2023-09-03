import Notification from '../../../src/communication/notification/Notification';
import { WebhookClient } from 'discord.js';

class TestNotification extends Notification {
  constructor() {
    super();
  }

  /**
   * mocks WebhookClient
   */
  mockWebhookClient = () => {
    this.hookClient = undefined as any as WebhookClient;
  };

  /**
   * mocks WebhookClient.send and return mocked object
   */
  mockSendMethodOfWebhookClient = () => {
    this.hookClient = {
      send: vi.fn(),
    } as any as WebhookClient;
    const functionSpy = vi.spyOn(this.hookClient, 'send');
    return functionSpy.mockResolvedValue(null as any);
  };
}

export default TestNotification;
