import { anything, deepEqual, spy, verify, when } from "ts-mockito";
import { EventTrigger, PaymentTransaction } from "../../../src/models/Models";
import CardanoChain from "../../../src/chains/cardano/CardanoChain";
import CardanoTransaction from "../../../src/chains/cardano/models/CardanoTransaction";

class MockedCardanoChain {

    mockedObject: CardanoChain

    constructor(cardanoChain: CardanoChain) {
        this.mockedObject = spy(cardanoChain)
    }

    /**
     * mocks CardanoChain generateTransaction method to return tx when called for an event
     * @param event
     * @param tx
     */
    mockGenerateTransaction = (event: EventTrigger, tx: CardanoTransaction): void => {
        when(this.mockedObject.generateTransaction(deepEqual(event))).thenResolve(tx)
    }

    /**
     * mocks CardanoChain requestToSignTransaction method when called for a tx
     *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with PaymentTransaction type.
     * @param tx
     */
    mockRequestToSignTransaction = (tx: PaymentTransaction): void => {
        when(this.mockedObject.requestToSignTransaction(anything())).thenResolve()
    }

    /**
     * verifies CardanoChain requestToSignTransaction method called once for tx
     *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with PaymentTransaction type.
     * @param tx
     */
    verifyRequestToSignTransactionCalledOnce = (tx: PaymentTransaction): void => {
        verify(this.mockedObject.requestToSignTransaction(anything())).once()
    }

    /**
     * verifies CardanoChain requestToSignTransaction method didn't get called for tx
     * @param tx
     */
    verifyRequestToSignTransactionDidntCalled = (tx: PaymentTransaction): void => {
        verify(this.mockedObject.requestToSignTransaction(deepEqual(tx))).never()
    }

}

export default MockedCardanoChain
