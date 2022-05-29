import ErgoChain from "../../../src/chains/ergo/ErgoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { CoveringErgoBoxes } from "../../../src/chains/ergo/models/Interfaces";
import Utils from "../../../src/chains/ergo/helpers/Utils";
import { mockGetCoveringErgAndTokenForErgoTree, resetMockedExplorerApi } from "./mocked/MockedExplorer";
import { spy } from "ts-mockito";
import ExplorerApi from "../../../src/chains/ergo/network/ExplorerApi";

describe("ErgoChain", async () => {
    const testBankAddress: string = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD"
    const testBankErgoTree: string = Utils.addressStringToErgoTreeString(testBankAddress)

    describe("generateTransaction", async () => {
        const mockedExplorer = spy(ExplorerApi)
        // mock getting bankBoxes
        const bankBoxes: Promise<CoveringErgoBoxes> = TestBoxes.mockBankBoxes()

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    ExplorerApi
         *    NodeApi
         * Expected Output:
         *    The function should construct a valid tx successfully
         *    It should also verify it successfully
         */
        it("should generate an Erg payment tx and verify it successfully", async () => {
            resetMockedExplorerApi(mockedExplorer)
            mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes, mockedExplorer)
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.true
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    ExplorerApi
         *    NodeApi
         * Expected Output:
         *    The function should construct a valid tx successfully
         *    It should also verify it successfully
         */
        it("should generate an token payment tx and verify it successfully", async () => {
            resetMockedExplorerApi(mockedExplorer)
            mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes, mockedExplorer)
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.true
        })

    })

    describe("verifyTransactionWithEvent", async () => {

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Erg payment tx that transferring token", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = await TestBoxes.mockTokenTransferringPaymentTransaction(mockedEvent)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx with no token transferring", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = await TestBoxes.mockErgTransferringPaymentTransaction(mockedEvent)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring multiple tokens", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = await TestBoxes.mockMultipleTokensTransferringPaymentTransaction(mockedEvent)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring wrong token", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = await TestBoxes.mockWrongTokenTransferringPaymentTransaction(mockedEvent)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

})
