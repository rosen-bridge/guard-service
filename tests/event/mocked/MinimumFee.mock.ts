import { Fee } from '@rosen-bridge/minimum-fee';
import MinimumFee from '../../../src/event/MinimumFee';

/**
 * mocks MinimumFee.getEventFeeConfig to return `result`
 * @param result
 */
const mockGetEventFeeConfig = (result: Fee) => {
  const functionSpy = vi.spyOn(MinimumFee, 'getEventFeeConfig');
  functionSpy.mockResolvedValue(result);
};

export { mockGetEventFeeConfig };
