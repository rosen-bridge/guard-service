import { deepEqual, spy, when } from "ts-mockito";
import { EventTrigger } from "../../../src/models/Models";
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
    mockGenerateTransactionCalledOnce = (event: EventTrigger, tx: CardanoTransaction): void => {
        when(this.mockedObject.generateTransaction(deepEqual(event))).thenResolve(tx)
    }

}

export default MockedCardanoChain
