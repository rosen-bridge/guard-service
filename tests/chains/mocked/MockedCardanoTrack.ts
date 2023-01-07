import { anything, reset, spy, when } from 'ts-mockito';
import CardanoTrack from '../../../src/chains/cardano/CardanoTrack';
import { Utxo } from '../../../src/chains/cardano/models/Interfaces';

let mockedCardanoTrack = spy(CardanoTrack);

/**
 * mocks CardanoTrack trackAndFilterLockBoxes method to return boxes when called
 * @param boxes
 */
const mockTrackAndFilterLockBoxes = (boxes: Utxo[]): void => {
  when(mockedCardanoTrack.trackAndFilterLockBoxes(anything())).thenResolve(
    boxes
  );
};

/**
 * mocks CardanoTrack hasLockAddressEnoughAssets method to return result when called
 * @param result
 */
const mockCardanoHasLockAddressEnoughAssets = (result: boolean): void => {
  when(mockedCardanoTrack.hasLockAddressEnoughAssets(anything())).thenResolve(
    result
  );
};

/**
 * resets mocked methods of CardanoTrack
 */
const resetMockedCardanoTrack = (): void => {
  reset(mockedCardanoTrack);
  mockedCardanoTrack = spy(CardanoTrack);
};

export {
  mockTrackAndFilterLockBoxes,
  mockCardanoHasLockAddressEnoughAssets,
  resetMockedCardanoTrack,
};
