import axios from 'axios';
import { vi } from 'vitest';
import { RPC_URL, UNISAT_URL } from '../testData';

export enum ClientType {
  RPC = 'rpc',
  UNISAT = 'unisat',
}

export const rpcAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
  // Add mock methods for axios-rate-limit
  getMaxRPS: vi.fn().mockReturnValue(3),
  setMaxRPS: vi.fn(),
  setRateLimitOptions: vi.fn(),
  getQueue: vi.fn().mockReturnValue([]),
};

export const unisatAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
  // Add mock methods for axios-rate-limit
  getMaxRPS: vi.fn().mockReturnValue(3),
  setMaxRPS: vi.fn(),
  setRateLimitOptions: vi.fn(),
  getQueue: vi.fn().mockReturnValue([]),
};

/**
 * mocks axios.get function
 * @param client
 * @param result
 */
export const mockAxiosGet = (client: ClientType, result: any) => {
  (client === ClientType.RPC
    ? rpcAxiosInstance
    : unisatAxiosInstance
  ).get.mockResolvedValueOnce({
    data: result,
  });
};

/**
 * mocks axios.post function
 * @param client
 * @param result
 */
export const mockAxiosPost = (client: ClientType, result: any) => {
  (client === ClientType.RPC
    ? rpcAxiosInstance
    : unisatAxiosInstance
  ).post.mockResolvedValueOnce({
    data: result,
  });
};

/**
 * mocks axios.post function to throw
 * @param client
 * @param error
 */
export const mockAxiosPostToThrow = (client: ClientType, error: any) => {
  (client === ClientType.RPC
    ? rpcAxiosInstance
    : unisatAxiosInstance
  ).post.mockRejectedValueOnce(error);
};

/**
 * resets axios functions mocks and call counts
 */
export const resetAxiosMock = () => {
  rpcAxiosInstance.get.mockReset();
  rpcAxiosInstance.post.mockReset();
  unisatAxiosInstance.get.mockReset();
  unisatAxiosInstance.post.mockReset();

  // Mock axios.create to return our mocked instance
  vi.spyOn(axios, 'create').mockImplementation((config) => {
    const url = config?.baseURL;
    if (url?.includes(RPC_URL)) {
      return rpcAxiosInstance as any;
    } else if (url?.includes(UNISAT_URL)) {
      return unisatAxiosInstance as any;
    } else {
      throw new Error(`Unknown url: ${url}`);
    }
  });
};
