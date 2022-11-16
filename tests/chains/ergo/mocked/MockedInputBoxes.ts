import { reset, spy, when } from 'ts-mockito';
import { EventTrigger } from '../../../../src/models/Models';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import InputBoxes from '../../../../src/chains/ergo/boxes/InputBoxes';
import TestBoxes from '../testUtils/TestBoxes';

let mockedInputBoxes = spy(InputBoxes);
when(mockedInputBoxes.getGuardsInfoBox()).thenResolve(TestBoxes.guardNFTBox);

/**
 * mocks RewardBoxes getEventBox method to return returnBox when called for an event
 * @param event
 * @param returnBox
 */
const mockGetEventBox = (event: EventTrigger, returnBox: ErgoBox): void => {
  when(mockedInputBoxes.getEventBox(event)).thenResolve(returnBox);
};

/**
 * mocks RewardBoxes getEventValidCommitments method to return returnBoxes when called for an event
 * @param event
 * @param returnBoxes
 */
const mockGetEventValidCommitments = (
  event: EventTrigger,
  returnBoxes: ErgoBox[]
): void => {
  when(mockedInputBoxes.getEventValidCommitments(event)).thenResolve(
    returnBoxes
  );
};

/**
 * resets mocked methods of RewardBoxes
 */
const resetMockedInputBoxes = (): void => {
  reset(mockedInputBoxes);
  mockedInputBoxes = spy(InputBoxes);
  when(mockedInputBoxes.getGuardsInfoBox()).thenResolve(TestBoxes.guardNFTBox);
};

export { mockGetEventBox, mockGetEventValidCommitments, resetMockedInputBoxes };
