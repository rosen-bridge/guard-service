import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

import { RPC_URL, UNISAT_URL } from '../testData';

export enum ClientType {
  RPC = 'rpc',
  UNISAT = 'unisat',
}

export const rpcAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
};

export const unisatAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
};

/**
 * mocks axios.get function
 * @param client
 * @param result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  vi.spyOn(RateLimitedAxios, 'create').mockImplementation((config) => {
    const url = config?.baseURL;
    if (url?.includes(RPC_URL)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rpcAxiosInstance as any;
    } else if (url?.includes(UNISAT_URL)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unisatAxiosInstance as any;
    } else {
      throw new Error(`Unknown url: ${url}`);
    }
  });
};
