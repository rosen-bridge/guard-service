import { vi } from 'vitest';

import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

export const axiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
};

/**
 * mocks axios.get function
 * @param result
 */
export const mockAxiosGet = (result: any) => {
  axiosInstance.get.mockResolvedValueOnce({
    data: result,
  });
};

/**
 * mocks axios.get function
 * @param error
 */
export const mockAxiosGetToThrow = (error: any) => {
  axiosInstance.get.mockRejectedValueOnce(error);
};

/**
 * mocks axios.post function
 * @param result
 */
export const mockAxiosPost = (result: any) => {
  axiosInstance.post.mockResolvedValueOnce({
    data: result,
  });
};

/**
 * mocks axios.post function to throw
 * @param error
 */
export const mockAxiosPostToThrow = (error: any) => {
  axiosInstance.post.mockRejectedValueOnce(error);
};

/**
 * resets axios functions mocks and call counts
 */
export const resetAxiosMock = () => {
  axiosInstance.get.mockReset();
  axiosInstance.post.mockReset();

  // Mock axios.create to return our mocked instance
  vi.spyOn(RateLimitedAxios, 'create').mockReturnValue(axiosInstance as any);
};
