import { deepEqual, spy, when } from "ts-mockito";
import { EventTrigger } from "../../../src/models/Models";
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
    mockGenerateTransactionCalledOnce = (event: EventTrigger, tx: ErgoTransaction): void => {
        when(this.mockedObject.generateTransaction(deepEqual(event))).thenResolve(tx)
    }

}

export default MockedErgoChain
