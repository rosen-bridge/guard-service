import { anything, reset, spy, when } from 'ts-mockito';
import { CoveringErgoBoxes } from '../../../src/chains/ergo/models/Interfaces';
import ErgoTrack from '../../../src/chains/ergo/ErgoTrack';

let mockedErgoTrack = spy(ErgoTrack);

/**
 * mocks Reward trackAndFilterLockBoxes method to return boxes when called
 * @param boxes
 */
const mockTrackAndFilterLockBoxes = (boxes: CoveringErgoBoxes): void => {
  when(mockedErgoTrack.trackAndFilterLockBoxes(anything())).thenResolve(boxes);
};

/**
 * mocks Reward hasLockAddressEnoughAssets method to return result when called
 * @param result
 */
const mockErgoHasLockAddressEnoughAssets = (result: boolean): void => {
  when(mockedErgoTrack.hasLockAddressEnoughAssets(anything())).thenResolve(
    result
  );
};

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedErgoTrack = (): void => {
  reset(mockedErgoTrack);
  mockedErgoTrack = spy(ErgoTrack);
};

export {
  mockTrackAndFilterLockBoxes,
  mockErgoHasLockAddressEnoughAssets,
  resetMockedErgoTrack,
};
