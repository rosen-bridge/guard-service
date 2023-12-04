import { dialerInstance } from '../communication/mocked/Dialer.mock';

vi.doMock('../../src/communication/Dialer', () => ({
  default: {
    getInstance: () => dialerInstance,
  },
}));
