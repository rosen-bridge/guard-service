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
    } as RosenDialerNode;
  }

  /**
   * get the singleton instance of RosenDialerMock
   */
  static getInstance(): RosenDialerMock {
    if (!RosenDialerMock.instance) {
      RosenDialerMock.instance = new RosenDialerMock();
    }
    return RosenDialerMock.instance;
  }

  /**
   * returns the dialer instance
   */
  getDialer(): RosenDialerNode {
    return this.dialer;
  }

  /**
   * returns mock the implementation of startNode function
   */
  startNode(): Promise<void> {
    return Promise.resolve(); // Mock implementation
  }

  /**
   * resets the mock on `sendMessage` function
   */
  resetMock() {
    this.sendMessageMock.mockReset();
  }

  /**
   * Mock the sendMessage implementation
   * @param imp A callback function that will be called when sendMessage is invoked
   */
  static mockSendMessageImplementation(
    imp: (channel: string, msg: string, receiver?: string) => Promise<void>
  ) {
    RosenDialerMock.getInstance().sendMessageMock.mockImplementation(imp);
  }
}

export default RosenDialerMock;
