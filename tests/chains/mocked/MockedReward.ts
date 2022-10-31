import { anything, reset, spy, verify, when } from 'ts-mockito';
import Reward from '../../../src/chains/ergo/Reward';
import { EventTrigger } from '../../../src/models/Models';
import ErgoTransaction from '../../../src/chains/ergo/models/ErgoTransaction';

let mockedReward = spy(Reward);

/**
 * mocks Reward generateTransaction method to return tx when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param tx
 */
const mockRewardGenerateTransaction = (
  event: EventTrigger,
  tx: ErgoTransaction
): void => {
  when(mockedReward.generateTransaction(anything(), anything())).thenResolve(
    tx
  );
};

/**
 * verifies Reward generateTransaction method called once for event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 */
const verifyRewardGenerateTransactionCalledOnce = (
  event: EventTrigger
): void => {
  verify(mockedReward.generateTransaction(anything(), anything())).once();
};

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedReward = (): void => {
  reset(mockedReward);
  mockedReward = spy(Reward);
};

export {
  mockRewardGenerateTransaction,
  verifyRewardGenerateTransactionCalledOnce,
  resetMockedReward,
};
