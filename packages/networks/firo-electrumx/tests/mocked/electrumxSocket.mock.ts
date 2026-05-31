import { EventEmitter } from 'events';
import { vi } from 'vitest';

let mockResponses: Array<unknown> = [];

export function setMockResponses(responses: Array<unknown>) {
  mockResponses = [...responses];
}

export function resetMock() {
  mockResponses = [];
}

function createMockSocket() {
  const socket = new EventEmitter() as EventEmitter & {
    written: string[];
    destroyed: boolean;
    write: (data: string) => boolean;
    destroy: () => void;
    setEncoding: () => void;
    setNoDelay: () => void;
    setTimeout: () => void;
    end: () => void;
    ref: () => void;
    unref: () => void;
  };
  socket.written = [];
  socket.destroyed = false;

  socket.write = (data: string) => {
    socket.written.push(data);
    const lines = data.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      try {
        const req = JSON.parse(line);
        if (req.method === 'server.version') {
          setTimeout(
            () =>
              socket.emit(
                'data',
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: req.id,
                  result: ['guard-service', '1.4'],
                }) + '\n',
              ),
            0,
          );
        } else {
          const resp = mockResponses.shift();
          if (resp !== undefined && resp !== null) {
            const isError =
              typeof resp === 'object' &&
              'error' in resp &&
              resp.error !== null &&
              resp.error !== undefined;
            setTimeout(
              () =>
                socket.emit(
                  'data',
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: req.id,
                    [isError ? 'error' : 'result']: isError ? resp.error : resp,
                  }) + '\n',
                ),
              0,
            );
          }
        }
      } catch {
        /* ignore */
      }
    }
    return true;
  };

  socket.destroy = () => {
    socket.destroyed = true;
  };
  socket.setEncoding = vi.fn();
  socket.setNoDelay = vi.fn();
  socket.setTimeout = vi.fn();
  socket.end = vi.fn();
  socket.ref = vi.fn();
  socket.unref = vi.fn();

  return socket;
}

// Mock the 'net' module
vi.mock('net', () => {
  return {
    createConnection: vi.fn(() => {
      const socket = createMockSocket();
      setTimeout(() => socket.emit('connect'), 0);
      return socket;
    }),
  };
});
