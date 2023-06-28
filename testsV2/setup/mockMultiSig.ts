vi.doMock('../../src/guard/multisig/MultiSigHandler', () => ({
  default: {
    getInstance: () => ({
      sign: vi.fn(),
    }),
  },
}));
