import { anything, reset, spy, when } from "ts-mockito";
import ExplorerApi from "../../../../src/chains/ergo/network/ExplorerApi";
import { Boxes, CoveringErgoBoxes, ExplorerTransaction } from "../../../../src/chains/ergo/models/Interfaces";


let mockedExplorer = spy(ExplorerApi)

/**
 * mocks ExplorerApi getCoveringErgAndTokenForAddress method to return returnBoxes when called for an address ergoTree
 * @param ergoTree
 * @param returnBoxes
 */
const mockGetCoveringErgAndTokenForErgoTree = (ergoTree: string, returnBoxes: CoveringErgoBoxes): void => {
    when(mockedExplorer.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything()
    )).thenResolve(returnBoxes)
    when(mockedExplorer.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything(),
        anything()
    )).thenResolve(returnBoxes)
}

/**
 * mocks ExplorerApi getBoxesForErgoTree method to return returnBoxes when called for an address ergoTree
 * @param ergoTree
 * @param returnBoxes
 */
const mockGetBoxesForErgoTree = (ergoTree: string, returnBoxes: Boxes): void => {
    const singleReturn: Boxes = {
        items: [returnBoxes.items[0]],
        total: returnBoxes.total
    }
    when(mockedExplorer.getBoxesForErgoTree(ergoTree, 0, 1)).thenResolve(singleReturn)

    for (let i = 0; i < returnBoxes.total; i += 10) {
        const roundReturn: Boxes = {
            items: returnBoxes.items.slice(i, i + 10),
            total: returnBoxes.total
        }
        when(mockedExplorer.getBoxesForErgoTree(ergoTree, i, 10)).thenResolve(roundReturn)
    }
}

/**
 * mocks ExplorerApi getTxConfirmation method to return confirmation when called for txId
 * @param txId
 * @param confirmation
 */
const mockExplorerGetTxConfirmation = (txId: string, confirmation: number): void => {
    when(mockedExplorer.getTxConfirmation(txId)).thenResolve(confirmation)
}

/**
 * mocks ExplorerApi getConfirmedTx method to return transaction when called for txId
 * @param txId
 * @param tx
 */
const mockExplorerGetConfirmedTx = (txId: string, tx: ExplorerTransaction): void => {
    when(mockedExplorer.getConfirmedTx(txId)).thenResolve(tx)
}

/**
 * mocks ExplorerApi isTxInMempool method to return result when called for txId
 * @param txId
 * @param result
 */
const mockIsTxInMempool = (txId: string, result: boolean): void => {
    when(mockedExplorer.isTxInMempool(txId)).thenResolve(result)
}

/**
 * mocks ExplorerApi isBoxUnspentAndValid method to return result when called for boxId
 * @param boxId
 * @param result
 */
const mockIsBoxUnspentAndValid = (boxId: string, result: boolean): void => {
    when(mockedExplorer.isBoxUnspentAndValid(boxId)).thenResolve(result)
}

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedExplorerApi = (): void => {
    reset(mockedExplorer)
    mockedExplorer = spy(ExplorerApi)
}

export {
    mockGetCoveringErgAndTokenForErgoTree,
    mockGetBoxesForErgoTree,
    mockExplorerGetConfirmedTx,
    mockExplorerGetTxConfirmation,
    mockIsTxInMempool,
    mockIsBoxUnspentAndValid,
    resetMockedExplorerApi
}
