import { anything, deepEqual, resetCalls, spy, verify, when } from "ts-mockito";
import { EventTrigger, PaymentTransaction } from "../../../src/models/Models";
import ErgoChain from "../../../src/chains/ergo/ErgoChain";
import ErgoTransaction from "../../../src/chains/ergo/models/ErgoTransaction";

class MockedErgoChain {

    mockedObject: ErgoChain

    constructor(ergoChain: ErgoChain) {
        this.mockedObject = spy(ergoChain)
    }

    /**
     * mocks ErgoChain generateTransaction method to return tx when called for an event
     * @param event
     * @param tx
     */
    mockGenerateTransaction = (event: EventTrigger, tx: ErgoTransaction): void => {
        when(this.mockedObject.generateTransaction(deepEqual(event))).thenResolve(tx)
    }

    /**
     * mocks ErgoChain requestToSignTransaction method when called for a tx
     * @param tx
     */
    mockRequestToSignTransaction = (tx: PaymentTransaction): void => {
        when(this.mockedObject.requestToSignTransaction(anything())).thenResolve()
    }

    /**
     * verifies ErgoChain requestToSignTransaction method called once for tx
     * @param tx
     */
    verifyRequestToSignTransactionCalledOnce = (tx: PaymentTransaction): void => {
        verify(this.mockedObject.requestToSignTransaction(anything())).once()
    }

    /**
     * verifies ErgoChain requestToSignTransaction method didn't get called for tx
     * @param tx
     */
    verifyRequestToSignTransactionDidntCalled = (tx: PaymentTransaction): void => {
        verify(this.mockedObject.requestToSignTransaction(deepEqual(tx))).never()
    }

    /**
     * mocks ErgoChain submitTransaction method when called for a tx
     * @param tx
     */
    mockSubmitTransaction = (tx: PaymentTransaction): void => {
        when(this.mockedObject.submitTransaction(anything())).thenResolve()
    }

    /**
     * verifies ErgoChain submitTransaction method called once for tx
     * @param tx
     */
    verifySubmitTransactionCalledOnce = (tx: PaymentTransaction): void => {
        verify(this.mockedObject.submitTransaction(anything())).once()
    }

    /**
     * reset call counts for mocked methods
     */
    resetMockCalls = (): void => {
        resetCalls(this.mockedObject)
    }

}

export default MockedErgoChain
