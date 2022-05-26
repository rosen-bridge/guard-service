import { anything, spy, when } from "ts-mockito";
import ExplorerApi from "../../../../src/chains/ergo/network/ExplorerApi";
import { CoveringErgoBoxes } from "../../../../src/chains/ergo/models/Interfaces";


const mockedExplorer = spy(ExplorerApi)

/**
 * mocks ExplorerApi getCoveringErgAndTokenForAddress method to return returnBoxes when called for an address ergoTree
 * @param ergoTree
 * @param returnBoxes
 */
const mockGetCoveringErgAndTokenForErgoTree = (ergoTree: string, returnBoxes: Promise<CoveringErgoBoxes>): void => {
    when(mockedExplorer.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything()
    )).thenReturn(returnBoxes)
    when(mockedExplorer.getCoveringErgAndTokenForErgoTree(
        ergoTree,
        anything(),
        anything()
    )).thenReturn(returnBoxes)
}

export default mockGetCoveringErgAndTokenForErgoTree
