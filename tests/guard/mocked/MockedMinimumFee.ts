import { anything, spy, when } from 'ts-mockito';
import MinimumFee from '../../../src/event/MinimumFee';
import { Fee } from '@rosen-bridge/minimum-fee';

const mockedMinimumFee = spy(MinimumFee.bridgeMinimumFee);

/**
 * mocks EventVerifier verifyEvent method to return result when called
 * @param result
 */
const mockGetFee = (result: Fee): void => {
  when(mockedMinimumFee.getFee(anything(), anything(), anything())).thenResolve(
    result
  );
};

export { mockGetFee };
