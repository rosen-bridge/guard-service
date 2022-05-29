import { anything, reset, spy, when } from "ts-mockito";
import ExplorerApi from "../../../../src/chains/ergo/network/ExplorerApi";
import { Boxes, CoveringErgoBoxes } from "../../../../src/chains/ergo/models/Interfaces";


// const mockedExplorer = spy(ExplorerApi)

/**
 * mocks ExplorerApi getCoveringErgAndTokenForAddress method to return returnBoxes when called for an address ergoTree
 * @param ergoTree
 * @param returnBoxes
 */
const mockGetCoveringErgAndTokenForErgoTree = (ergoTree: string, returnBoxes: Promise<CoveringErgoBoxes>, obj: typeof ExplorerApi): void => {
    when(obj.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything()
    )).thenReturn(returnBoxes)
    when(obj.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything(),
        anything()
    )).thenReturn(returnBoxes)
}

/**
 * mocks ExplorerApi getBoxesForErgoTree method to return returnBoxes when called for an address ergoTree
 * @param ergoTree
 * @param returnBoxes
 */
const mockGetBoxesForErgoTree = (ergoTree: string, returnBoxes: Promise<Boxes>, obj: typeof ExplorerApi): void => {
    when(obj.getBoxesForErgoTree(
        ergoTree,
        anything(),
        anything()
    )).thenReturn(returnBoxes)
}

/**
 * resets mocked methods of ExplorerApi
 */
const resetMockedExplorerApi = (obj: typeof ExplorerApi): void => {
    console.log("method called")
    reset(obj)
}

export { mockGetCoveringErgAndTokenForErgoTree, mockGetBoxesForErgoTree, resetMockedExplorerApi }
