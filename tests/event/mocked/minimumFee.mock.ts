import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';

import MinimumFeeHandler from '../../../src/handlers/minimumFeeHandler';

/**
 * mocks MinimumFee.getEventFeeConfig to return `result`
 * @param result
 */
const mockGetEventFeeConfig = (result: ChainMinimumFee) => {
  const functionSpy = vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig');
  functionSpy.mockResolvedValue(result);
};

export { mockGetEventFeeConfig };
