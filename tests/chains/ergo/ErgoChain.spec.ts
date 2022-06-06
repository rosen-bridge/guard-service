import ErgoChain from "../../../src/chains/ergo/ErgoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { CoveringErgoBoxes } from "../../../src/chains/ergo/models/Interfaces";
import Utils from "../../../src/chains/ergo/helpers/Utils";
import { mockGetCoveringErgAndTokenForErgoTree, resetMockedExplorerApi } from "./mocked/MockedExplorer";
import { beforeEach } from "mocha";

describe("ErgoChain", async () => {
    const testBankAddress = TestBoxes.testBankAddress
    const testBankErgoTree: string = Utils.addressStringToErgoTreeString(testBankAddress)

    describe("generateTransaction", async () => {
        // mock getting bankBoxes
        const bankBoxes: CoveringErgoBoxes = TestBoxes.mockBankBoxes()

        beforeEach("mock ExplorerApi", function() {
            resetMockedExplorerApi()
            mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes)
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
        it("should generate an Erg payment tx and verify it successfully", async () => {
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
        it("should generate a token payment tx and verify it successfully", async () => {
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

    describe("verifyTransactionWithEvent", () => {

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Erg payment tx that transferring token", () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockTokenTransferringPaymentTransaction(mockedEvent)

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
        it("should reject a token payment tx with no token transferring", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockErgTransferringPaymentTransaction(mockedEvent)

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
        it("should reject a token payment tx that transferring multiple tokens", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockMultipleTokensTransferringPaymentTransaction(mockedEvent)

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
        it("should reject a token payment tx that transferring wrong token", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockWrongTokenTransferringPaymentTransaction(mockedEvent)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

})
