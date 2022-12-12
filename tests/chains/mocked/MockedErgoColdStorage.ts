import { anything, reset, spy, verify, when } from 'ts-mockito';
import ErgoTransaction from '../../../src/chains/ergo/models/ErgoTransaction';
import ErgoColdStorage from '../../../src/chains/ergo/ErgoColdStorage';

let mockedErgoColdStorage = spy(ErgoColdStorage);

/**
 * mocks Reward generateTransaction method to return tx when called
 * @param tx
 */
const mockErgoColdStorageGenerateTx = (tx: ErgoTransaction): void => {
  when(mockedErgoColdStorage.generateTransaction(anything())).thenResolve(tx);
};

/**
 * verifies Reward generateTransaction method called once
 */
const verifyErgoColdStorageGenerateTxCalledOnce = (): void => {
  verify(mockedErgoColdStorage.generateTransaction(anything())).once();
};

/**
 * verifies Reward generateTransaction method didn't get called
 */
const verifyErgoColdStorageGenerateTxDidntGetCalled = (): void => {
  verify(mockedErgoColdStorage.generateTransaction(anything())).never();
};

/**
 * resets mocked methods of ErgoColdStorage
 */
const resetMockedErgoColdStorage = (): void => {
  reset(mockedErgoColdStorage);
  mockedErgoColdStorage = spy(ErgoColdStorage);
};

export {
  mockErgoColdStorageGenerateTx,
  verifyErgoColdStorageGenerateTxCalledOnce,
  verifyErgoColdStorageGenerateTxDidntGetCalled,
  resetMockedErgoColdStorage,
};
