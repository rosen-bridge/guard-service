import { RosenDialerNode } from '@rosen-bridge/dialer';

class RosenDialerMock {
  private static instance: RosenDialerMock;
  protected dialer: RosenDialerNode;
  private sendMessageMock = vi.fn();

  private constructor() {
    this.dialer = {
      getDialerId: () => 'dialer-peer-id',
      subscribeChannel(
        channel: string,
        callback: (
          msg: string,
          channel: string,
          sender: string,
          url?: string
        ) => void
      ): void {
        // Mock subscription logic
      },
      sendMessage(
        channel: string,
        msg: string,
        receiver?: string
      ): Promise<void> {
        return RosenDialerMock.getInstance().sendMessageMock(
          channel,
          msg,
          receiver
        );
      },
    } as RosenDialerNode; // Mock implementation of RosenDialerNode
  }

  static getInstance(): RosenDialerMock {
    if (!RosenDialerMock.instance) {
      RosenDialerMock.instance = new RosenDialerMock();
    }
    return RosenDialerMock.instance;
  }

  getDialer(): RosenDialerNode {
    return this.dialer;
  }

  startNode(): Promise<void> {
    return Promise.resolve(); // Mock implementation
  }

  resetMock() {
    this.sendMessageMock.mockReset();
  }

  static mockSendMessageImplementation(
    imp: (channel: string, msg: string, receiver?: string) => Promise<void>
  ) {
    RosenDialerMock.getInstance().sendMessageMock.mockImplementation(imp);
  }
}

export default RosenDialerMock;
