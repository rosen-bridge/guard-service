vi.doMock('../../src/communication/Dialer', () => ({
  default: {
    getInstance: () => ({
      subscribeChannel: vi.fn(),
      sendMessage: vi.fn(),
    }),
  },
}));
