import { anything, reset, spy, verify, when } from "ts-mockito";
import BlockFrostApi from "../../../../src/chains/cardano/network/BlockFrostApi";
import TestConfigs from "../../../testUtils/TestConfigs";
import { Transaction } from "@emurgo/cardano-serialization-lib-nodejs";
import TestBoxes from "../testUtils/TestBoxes";
import Utils from "../../../../src/helpers/Utils";


// test configs
const testCurrentSlot: number = TestConfigs.cardano.currentSlot
const testBlockchainHeight: number = TestConfigs.cardano.blockchainHeight

let mockedBlockFrost = spy(BlockFrostApi)
when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)
when(mockedBlockFrost.currentHeight()).thenResolve(testBlockchainHeight)

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
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with Transaction type.
 * @param tx
 */
const verifyTxSubmitCalledOnce = (tx: Transaction): void => {
    verify(mockedBlockFrost.txSubmit(anything())).once()
}

/**
 * mocks BlockFrostApi getAddressUtxos and getTxUtxos methods to result appropriate values when processing inputs of tx
 * @param tx
 * @param valid determine if mock so that inputs be valid
 */
const mockInputProcessingMethods = (tx: Transaction, valid: boolean): void => {
    const testAddress = "addr_test1vzg07d2qp3xje0w77f982zkhqey50gjxrsdqh89yx8r7nasu97hr0"
    const inputs = tx.body().inputs()
    const boxTxs: string[] = []
    const boxIndexes: number[] = []
    for (let i = 0; i < inputs.len(); i++) {
        if (i === 0 && !valid) continue

        const txHash = Utils.Uint8ArrayToHexString(inputs.get(i).transaction_id().to_bytes())
        const index = inputs.get(i).index()
        const mockedTx = TestBoxes.mockTxUtxos(txHash, index + 1, testAddress)

        when(mockedBlockFrost.getTxUtxos(txHash)).thenResolve(mockedTx)
        boxTxs.push(txHash)
        boxIndexes.push(index)
    }
    const mockedAddress = TestBoxes.mockAddressUtxos(boxTxs, boxIndexes)
    when(mockedBlockFrost.getAddressUtxos(testAddress)).thenResolve(mockedAddress)
}

/**
 * resets mocked methods of BlockFrostApi
 */
const resetMockedBlockFrostApi = (): void => {
    reset(mockedBlockFrost)
    mockedBlockFrost = spy(BlockFrostApi)
    when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)
    when(mockedBlockFrost.currentHeight()).thenResolve(testBlockchainHeight)
}

export default {
    mockTxSubmit,
    mockTxSubmitError,
    verifyTxSubmitCalledOnce,
    mockInputProcessingMethods,
    resetMockedBlockFrostApi
}
