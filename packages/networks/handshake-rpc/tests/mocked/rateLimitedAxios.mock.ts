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
 * mocks axios.post function to throw error
 * @param error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosPostToThrow = (error: any) => {
  axiosInstance.post.mockRejectedValueOnce(error);
};

/**
 * resets axios functions mocks and call counts
 */
export const resetAxiosMock = () => {
  axiosInstance.post.mockReset();
  vi.spyOn(RateLimitedAxios, 'create').mockReturnValue(axiosInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any
};
