import { anything, reset, spy, verify, when } from 'ts-mockito';
import CardanoColdStorage from '../../../src/chains/cardano/CardanoColdStorage';
import CardanoTransaction from '../../../src/chains/cardano/models/CardanoTransaction';

let mockedCardanoColdStorage = spy(CardanoColdStorage);

/**
 * mocks Reward generateTransaction method to return tx when called
 * @param tx
 */
const mockCardanoColdStorageGenerateTx = (tx: CardanoTransaction): void => {
  when(mockedCardanoColdStorage.generateTransaction(anything())).thenResolve(
    tx
  );
};

/**
 * verifies Reward generateTransaction method called once
 */
const verifyCardanoColdStorageGenerateTxCalledOnce = (): void => {
  verify(mockedCardanoColdStorage.generateTransaction(anything())).once();
};

/**
 * verifies Reward generateTransaction method didn't get called
 */
const verifyCardanoColdStorageGenerateTxDidntGetCalled = (): void => {
  verify(mockedCardanoColdStorage.generateTransaction(anything())).never();
};

/**
 * resets mocked methods of CardanoColdStorage
 */
const resetMockedCardanoColdStorage = (): void => {
  reset(mockedCardanoColdStorage);
  mockedCardanoColdStorage = spy(CardanoColdStorage);
};

export {
  mockCardanoColdStorageGenerateTx,
  verifyCardanoColdStorageGenerateTxCalledOnce,
  verifyCardanoColdStorageGenerateTxDidntGetCalled,
  resetMockedCardanoColdStorage,
};
