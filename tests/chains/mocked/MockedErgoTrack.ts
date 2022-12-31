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
 * resets mocked methods of ExplorerApi
 */
const resetMockedErgoTrack = (): void => {
  reset(mockedErgoTrack);
  mockedErgoTrack = spy(ErgoTrack);
};

export { mockTrackAndFilterLockBoxes, resetMockedErgoTrack };
