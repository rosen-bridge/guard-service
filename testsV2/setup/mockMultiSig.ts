vi.doMock('../../src/guard/multisig/MultiSig', () => ({
  default: {
    getInstance: () => ({
      sign: vi.fn(),
    }),
  },
}));
