import ErgoChain from "../../../src/chains/ergo/ErgoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { CoveringErgoBoxes, ExplorerTransaction } from "../../../src/chains/ergo/models/Interfaces";
import Utils from "../../../src/chains/ergo/helpers/Utils";
import {
    mockExplorerGetConfirmedTx,
    mockGetCoveringErgAndTokenForErgoTree,
    resetMockedExplorerApi
} from "./mocked/MockedExplorer";
import { beforeEach } from "mocha";
import { mockGetEventBox, mockGetEventValidCommitments, resetMockedRewardBoxes } from "./mocked/MockedRewardBoxes";
import { anything } from "ts-mockito";
import Reward from "../../../src/chains/ergo/Reward";
import TestData from "./testUtils/TestData";

describe("ErgoChain",  () => {
    const testBankAddress = TestBoxes.testBankAddress
    const testBankErgoTree: string = Utils.addressStringToErgoTreeString(testBankAddress)

    describe("generateTransaction", () => {
        // mock getting bankBoxes
        const bankBoxes: CoveringErgoBoxes = TestBoxes.mockBankBoxes()
        const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()
        const observationTx = JSON.parse(TestData.mockedObservationTx)

        beforeEach("mock ExplorerApi", function() {
            resetMockedExplorerApi()
            mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes)
            resetMockedRewardBoxes()
            mockGetEventBox(anything(), eventBoxAndCommitments[0])
            mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1))
            mockExplorerGetConfirmedTx(observationTx.id, observationTx)
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
        // mock getting boxes
        const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()

        beforeEach("mock ExplorerApi", function() {
            resetMockedRewardBoxes()
            mockGetEventBox(anything(), eventBoxAndCommitments[0])
            mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1))
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Erg payment tx that transferring token", () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockTokenTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx with no token transferring", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockErgTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring multiple tokens", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockMultipleTokensTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring wrong token", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockWrongTokenTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    RewardBoxes
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that distributing reward to wrong WID", () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger()
            const tx = TestBoxes.mockTransferToIllegalWIDTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const reward = new Reward()
            const isValid = reward.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    RewardBoxes
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that missing a valid commitment box when distributing rewards", () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger()
            const tx = TestBoxes.mockMissingValidCommitmentTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments.slice(0, eventBoxAndCommitments.length - 1))

            // run test
            const reward = new Reward()
            const isValid = reward.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that burning some token", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a erg payment tx that burning some token", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningErgPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

    describe("verifyEventWithPayment", () => {
        it("should return true because the event is correct", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.true
        })
    })

})
