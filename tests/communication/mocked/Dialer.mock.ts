export const dialerInstance = {
  subscribeChannel: vi.fn(),
  getDialerId: () => 'dialer-peer-id',
  sendMessage: (
    channel: string,
    msg: string,
    receiver?: string
  ): Promise<void> => {
    throw Error(`Dialer 'sendMessage' is not mocked!`);
  },
};

class DialerMock {
  static sendMessageMock = vi.fn();

  /**
   * resets all mocked functions if dialer
   */
  static resetMock = () => {
    this.sendMessageMock.mockReset();
    dialerInstance.sendMessage = this.sendMessageMock;
  };

  /**
   * mocks implementation of Dialer.sendMessage
   * @param imp
   */
  static mockSendMessageImplementation = (
    imp: (channel: string, msg: string, receiver?: string) => Promise<void>
  ) => {
    this.sendMessageMock.mockImplementation(imp);
  };
}

export default DialerMock;
