import { anything, reset, spy, when } from 'ts-mockito';
import CardanoTrack from '../../../src/chains/cardano/CardanoTrack';

let mockedCardanoTrack = spy(CardanoTrack);

/**
 * mocks Reward hasLockAddressEnoughAssets method to return result when called
 * @param result
 */
const mockCardanoHasLockAddressEnoughAssets = (result: boolean): void => {
  when(mockedCardanoTrack.hasLockAddressEnoughAssets(anything())).thenResolve(
    result
  );
};

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedCardanoTrack = (): void => {
  reset(mockedCardanoTrack);
  mockedCardanoTrack = spy(CardanoTrack);
};

export { mockCardanoHasLockAddressEnoughAssets, resetMockedCardanoTrack };
