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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockAxiosGet = (result: any) => {
  axiosInstance.get.mockResolvedValueOnce({
    data: result,
  });
};

/**
 * mocks axios.get function
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
  axiosInstance.get.mockReset();
  axiosInstance.post.mockReset();

  // Mock axios.create to return our mocked instance
  vi.spyOn(RateLimitedAxios, 'create').mockReturnValue(axiosInstance as any); // eslint-disable-line @typescript-eslint/no-explicit-any
};
