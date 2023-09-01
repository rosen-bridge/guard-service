import Notification from '../../../src/communication/notification/Notification';

class TestNotification extends Notification {
  constructor() {
    super();
  }

  mockSendMethodOfWebhookClient = () => {
    const functionSpy = vi.spyOn(this.hookClient, 'send');
    return functionSpy.mockResolvedValue(null as any);
  };
}

export default TestNotification;
