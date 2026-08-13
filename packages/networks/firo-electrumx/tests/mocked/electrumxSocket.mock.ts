import { vi } from 'vitest';

let mockResponses: Array<unknown> = [];
const mockRequests: Array<{ method: string; params: unknown[] }> = [];
const mockConstructors: Array<{
  host: string;
  port: number;
  reconnectDelay?: number;
  timeout?: number;
  logger?: unknown;
}> = [];

export function setMockResponses(responses: Array<unknown>) {
  mockResponses = [...responses];
}

export function getMockRequests() {
  return mockRequests;
}

export function getMockConstructors() {
  return mockConstructors;
}

export function resetMock() {
  mockResponses = [];
  mockRequests.length = 0;
  mockConstructors.length = 0;
}

export class ElectrumXSocket {
  setupSocket = vi.fn();
  disconnect = vi.fn();

  constructor(
    host: string,
    port: number,
    reconnectDelay?: number,
    timeout?: number,
    logger?: unknown,
  ) {
    mockConstructors.push({ host, port, reconnectDelay, timeout, logger });
  }

  sendRequest = vi.fn(async (method: string, params: unknown[]) => {
    mockRequests.push({ method, params });
    const response = mockResponses.shift();
    if (
      typeof response === 'object' &&
      response !== null &&
      'error' in response
    ) {
      throw response.error;
    }
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });
}
