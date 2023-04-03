import { vi } from 'vitest';

vi.doMock('../src/communication/Dialer', () => ({
  default: {
    getInstance: () => ({
      subscribeChannel: vi.fn(),
    }),
  },
}));
