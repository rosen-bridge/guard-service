import axios from 'axios';
import { vi } from 'vitest';

// Mock axios-rate-limit
vi.mock('axios-rate-limit', () => {
  return {
    default: vi.fn().mockImplementation((axiosInstance, options) => {
      return axiosInstance;
    }),
  };
});

export const axiosInstance = {
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
 * resets axios functions mocks and call counts
 */
export const resetAxiosMock = () => {
  axiosInstance.get.mockReset();
  axiosInstance.post.mockReset();
  axiosInstance.interceptors.request.use.mockReset();
  axiosInstance.interceptors.response.use.mockReset();

  // Reset rate-limit function mocks
  axiosInstance.getMaxRPS = vi.fn().mockReturnValue(3);
  axiosInstance.setMaxRPS = vi.fn();
  axiosInstance.setRateLimitOptions = vi.fn();
  axiosInstance.getQueue = vi.fn().mockReturnValue([]);

  // Mock axios.create to return our mocked instance
  vi.spyOn(axios, 'create').mockReturnValue(axiosInstance as any);
};
