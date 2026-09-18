import { vi } from 'vitest';

import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

export const axiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
};

/**
 * mocks axios.post function for RPC calls
 * @param result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosPost = (result: any) => {
  axiosInstance.post.mockImplementationOnce((url, data) => {
    return Promise.resolve({
      data: {
        result: result,
        error: null,
        id: data.id, // Return the same ID from the request
      },
    });
  });
};

/**
 * mocks axios.post function to resolve with a failed RPC call
 *
 * hsd answers a failed call with HTTP 200 and an `error` object in the body, so
 * the request itself succeeds
 * @param code the rpc error code
 * @param message the rpc error message
 */
export const mockAxiosPostRpcError = (code: number, message: string) => {
  axiosInstance.post.mockImplementationOnce((url, data) => {
    return Promise.resolve({
      data: {
        result: null,
        error: { code: code, message: message },
        id: data.id, // Return the same ID from the request
      },
    });
  });
};

/**
 * mocks axios.post function to throw error
 * @param error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosPostToThrow = (error: any) => {
  axiosInstance.post.mockRejectedValueOnce(error);
};

/**
 * mocks axios.get function for REST calls
 * @param data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosGet = (data: any) => {
  axiosInstance.get.mockResolvedValueOnce({ data: data });
};

/**
 * mocks axios.get function to throw error
 * @param error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosGetToThrow = (error: any) => {
  axiosInstance.get.mockRejectedValueOnce(error);
};

/**
 * resets axios functions mocks and call counts
 */
export const resetAxiosMock = () => {
  axiosInstance.post.mockReset();
  axiosInstance.get.mockReset();
  vi.spyOn(RateLimitedAxios, 'create').mockReturnValue(axiosInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any
};
