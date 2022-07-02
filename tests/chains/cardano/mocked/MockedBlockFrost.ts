import { reset, spy, verify, when } from "ts-mockito";
import BlockFrostApi from "../../../../src/chains/cardano/network/BlockFrostApi";
import TestConfigs from "../../../testUtils/TestConfigs";
import { Transaction } from "@emurgo/cardano-serialization-lib-nodejs";


// test configs
const testCurrentSlot: number = TestConfigs.cardano.currentSlot

let mockedBlockFrost = spy(BlockFrostApi)
when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)

/**
 * mocks BlockFrostApi txSubmit method to return returnBoxes when called for tx
 * @param tx
 * @param returnTxId
 */
const mockTxSubmit = (tx: Transaction, returnTxId: string): void => {
    when(mockedBlockFrost.txSubmit(tx)).thenResolve(returnTxId)
}

/**
 * mocks BlockFrostApi txSubmit method to throw error when called for tx
 * @param tx
 */
const mockTxSubmitError = (tx: Transaction): void => {
    when(mockedBlockFrost.txSubmit(tx)).thenThrow(new Error("test error..."))
}

/**
 * verifies BlockFrostApi txSubmit method called once for tx
 * @param tx
 */
const verifyTxSubmitCalledOnce = (tx: Transaction): void => {
    verify(mockedBlockFrost.txSubmit(tx)).once()
}

/**
 * resets mocked methods of BlockFrostApi
 */
const resetMockedBlockFrostApi = (): void => {
    reset(mockedBlockFrost)
    mockedBlockFrost = spy(BlockFrostApi)
    when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)
}

export default {
    mockTxSubmit,
    mockTxSubmitError,
    verifyTxSubmitCalledOnce,
    resetMockedBlockFrostApi
}
