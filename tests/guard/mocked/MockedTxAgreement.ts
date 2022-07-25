import { deepEqual, reset, spy, verify, when } from "ts-mockito";
import { PaymentTransaction } from "../../../src/models/Models";
import { txAgreement } from "../../../src/guard/agreement/TxAgreement";

let mockedTxAgreement = spy(txAgreement)

/**
 * mocks txAgreement startAgreementProcess method when called for tx
 * @param tx
 */
const mockStartAgreementProcess = (tx: PaymentTransaction): void => {
    when(mockedTxAgreement.startAgreementProcess(deepEqual(tx))).thenResolve()
}

/**
 * verifies txAgreement startAgreementProcess method called once for tx
 * @param tx
 */
const verifyStartAgreementProcessCalledOnce = (tx: PaymentTransaction): void => {
    verify(mockedTxAgreement.startAgreementProcess(deepEqual(tx))).once()
}

/**
 * resets mocked methods of txAgreement
 */
const resetMockedTxAgreement = (): void => {
    reset(mockedTxAgreement)
    mockedTxAgreement = spy(txAgreement)
}

export {
    mockStartAgreementProcess,
    verifyStartAgreementProcessCalledOnce,
    resetMockedTxAgreement
}
