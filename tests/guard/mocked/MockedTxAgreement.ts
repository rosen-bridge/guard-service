import { anything, deepEqual, reset, spy, verify, when } from 'ts-mockito';
import { PaymentTransaction } from '../../../src/models/Models';
import { txAgreement } from '../../../src/guard/agreement/TxAgreement';
import { InputUtxo } from '../../../src/chains/cardano/models/Interfaces';

let mockedTxAgreement = spy(txAgreement);

/**
 * mocks txAgreement startAgreementProcess method when called for tx
 * @param tx
 */
const mockStartAgreementProcess = (tx: PaymentTransaction): void => {
  when(mockedTxAgreement.startAgreementProcess(deepEqual(tx))).thenResolve();
};

/**
 * verifies txAgreement startAgreementProcess method called once for tx
 * @param tx
 */
const verifyStartAgreementProcessCalledOnce = (
  tx: PaymentTransaction
): void => {
  verify(mockedTxAgreement.startAgreementProcess(tx)).once();
};

/**
 * verifies txAgreement startAgreementProcess method didn't get called
 */
const verifyStartAgreementProcessDidntGetCalled = (): void => {
  verify(mockedTxAgreement.startAgreementProcess(anything())).never();
};

/**
 * mocks txAgreement getErgoPendingTransactionsInputs method to return boxIds when called
 * @param boxIds
 */
const mockGetErgoPendingTransactionsInputs = (boxIds: string[]): void => {
  when(
    mockedTxAgreement.getErgoPendingTransactionsInputs(anything())
  ).thenReturn(boxIds);
};

/**
 * mocks txAgreement getCardanoPendingTransactionsInputs method to return ids when called
 * @param ids
 */
const mockGetCardanoPendingTransactionsInputs = (ids: InputUtxo[]): void => {
  when(mockedTxAgreement.getCardanoPendingTransactionsInputs()).thenReturn(ids);
};

/**
 * resets mocked methods of txAgreement
 */
const resetMockedTxAgreement = (): void => {
  reset(mockedTxAgreement);
  mockedTxAgreement = spy(txAgreement);
};

export {
  mockStartAgreementProcess,
  verifyStartAgreementProcessCalledOnce,
  verifyStartAgreementProcessDidntGetCalled,
  mockGetErgoPendingTransactionsInputs,
  mockGetCardanoPendingTransactionsInputs,
  resetMockedTxAgreement,
};
