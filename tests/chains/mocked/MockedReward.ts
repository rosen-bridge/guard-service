import { deepEqual, reset, spy, when } from "ts-mockito";
import Reward from "../../../src/chains/ergo/Reward";
import { EventTrigger } from "../../../src/models/Models";
import ErgoTransaction from "../../../src/chains/ergo/models/ErgoTransaction";


let mockedReward = spy(Reward)

/**
 * mocks Reward generateTransaction method to return tx when called for an event
 * @param event
 * @param tx
 */
const mockRewardGenerateTransaction = (event: EventTrigger, tx: ErgoTransaction): void => {
    when(mockedReward.generateTransaction(deepEqual(event))).thenResolve(tx)
}

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedReward = (): void => {
    reset(mockedReward)
    mockedReward = spy(Reward)
}

export {
    mockRewardGenerateTransaction,
    resetMockedReward
}
