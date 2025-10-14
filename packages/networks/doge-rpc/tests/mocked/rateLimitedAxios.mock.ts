import RateLimitedAxios from '@rosen-clients/rate-limited-axios';

export const axiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
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
