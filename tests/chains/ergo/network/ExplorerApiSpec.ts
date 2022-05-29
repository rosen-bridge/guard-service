import Utils from "../../../../src/chains/ergo/helpers/Utils";
import { Boxes } from "../../../../src/chains/ergo/models/Interfaces";
import {
    mockGetBoxesForErgoTree,
    resetMockedExplorerApi
} from "../mocked/MockedExplorer";
import { expect } from "chai";
import ExplorerApi from "../../../../src/chains/ergo/network/ExplorerApi";
import { spy } from "ts-mockito";

describe("ExplorerApi", async () => {
    const testBankAddress: string = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD"
    const testBankErgoTree: string = Utils.addressStringToErgoTreeString(testBankAddress)

    describe("getCoveringErgAndTokenForErgoTree", async () => {
        const mockedExplorer = spy(ExplorerApi)
        // mock getting bankBoxes
        const bankBoxes: Promise<Boxes> = new Promise<Boxes>((resolve, reject) => {
            resolve({
                items: [],
                total: 0
            })
        })

        it("test", async () => {
            resetMockedExplorerApi(mockedExplorer)
            mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes, mockedExplorer)
            // run test
            const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
                testBankErgoTree,
                BigInt("1000000000")
            )
            console.log(`boxes.covered: ${boxes.covered}`)
            console.log(`boxes.boxes.length: ${boxes.boxes.length}`)
        })

        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return enough boxes
        //  */
        // it("should return empty list with covered flag", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("0")
        //     )
        //     expect(boxes.covered).to.be.true
        //     expect(boxes.boxes.length).to.equal(0)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return enough boxes
        //  */
        // it("should return enough boxes that cover requested erg amount", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("1000000000")
        //     )
        //     expect(boxes.covered).to.be.true
        //     expect(boxes.boxes.length).to.equal(1)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return enough boxes
        //  */
        // it("should return enough boxes that cover requested erg and token amount", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("1000000000"),
        //         {
        //             ["068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906"]: BigInt("123456789123456789")
        //         }
        //     )
        //     expect(boxes.covered).to.be.true
        //     expect(boxes.boxes.length).to.equal(3)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return all boxes
        //  */
        // it("should return all boxes with covered flag", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("100000000000"),
        //         {
        //             ["907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"]: BigInt("100")
        //         }
        //     )
        //     expect(boxes.covered).to.be.true
        //     expect(boxes.boxes.length).to.equal(14)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return enough boxes
        //  */
        // it("should return enough boxes which is more than 10 boxes that cover requested erg amount", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("230000000000")
        //     )
        //     expect(boxes.covered).to.be.true
        //     expect(boxes.boxes.length).to.equal(13)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return all boxes
        //  */
        // it("should return all boxes with not-covered flag", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("555666771000000000")
        //     )
        //     expect(boxes.covered).to.be.false
        //     expect(boxes.boxes.length).to.equal(14)
        // })
        //
        // /**
        //  * Target: testing getCoveringErgAndTokenForErgoTree
        //  * Dependencies:
        //  *    ExplorerApi
        //  * Expected Output:
        //  *    The function should return all boxes
        //  */
        // it("should return all boxes with not-covered flag when can't cover tokens", async () => {
        //     // run test
        //     const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        //         testBankErgoTree,
        //         BigInt("1000000000"),
        //         {
        //             ["907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e"]: BigInt("500")
        //         }
        //     )
        //     expect(boxes.covered).to.be.false
        //     expect(boxes.boxes.length).to.equal(14)
        // })

    })

})
