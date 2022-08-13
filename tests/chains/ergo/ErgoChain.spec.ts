import ErgoChain from "../../../src/chains/ergo/ErgoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { CoveringErgoBoxes } from "../../../src/chains/ergo/models/Interfaces";
import {
    mockExplorerGetConfirmedTx,
    mockGetCoveringErgAndTokenForErgoTree,
    resetMockedExplorerApi
} from "./mocked/MockedExplorer";
import { beforeEach } from "mocha";
import TestData from "./testUtils/TestData";
import ErgoUtils from "../../../src/chains/ergo/helpers/ErgoUtils";
import {
    mockGetEventBox,
    mockGetEventValidCommitments,
    mockGetRSNRatioCoef,
    resetMockedInputBoxes
} from "./mocked/MockedInputBoxes";
import { anything, spy, when } from "ts-mockito";
import ErgoConfigs from "../../../src/chains/ergo/helpers/ErgoConfigs";
import sinon from "sinon";

describe("ErgoChain",  () => {
    const testBankAddress = TestBoxes.testBankAddress
    const testBankErgoTree: string = ErgoUtils.addressStringToErgoTreeString(testBankAddress)

    describe("generateTransaction", () => {
        // mock getting bankBoxes
        const bankBoxes: CoveringErgoBoxes = TestBoxes.mockBankBoxes()
        const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()

        beforeEach("mock ExplorerApi", function() {
            resetMockedExplorerApi()
            mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes)
            resetMockedInputBoxes()
            mockGetEventBox(anything(), eventBoxAndCommitments[0])
            mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1))
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
            mockGetRSNRatioCoef(anything(), [BigInt(0), BigInt(100000)])

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
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
            mockGetRSNRatioCoef(anything(), [BigInt(0), BigInt(100000)])

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
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
        it("should generate an Erg payment tx with RSN and verify it successfully", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            mockGetRSNRatioCoef(anything(), [BigInt(47), BigInt(100000)])
            const spiedErgoConfig = spy(ErgoConfigs)
            when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
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
        it("should generate a token payment tx with RSN and verify it successfully", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            mockGetRSNRatioCoef(anything(), [BigInt(47), BigInt(10)])
            const spiedErgoConfig = spy(ErgoConfigs)
            when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
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
        it("should generate an only RSN payment tx and verify it successfully", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            mockGetRSNRatioCoef(anything(), [BigInt(47), BigInt(100000)])
            const spiedErgoConfig = spy(ErgoConfigs)
            when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n)
            when(spiedErgoConfig.watchersSharePercent).thenReturn(0n)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const tx = await ergoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.true
        })

    })

    describe("verifyTransactionWithEvent", () => {
        // mock getting boxes
        const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()

        beforeEach("mock ExplorerApi", function() {
            resetMockedInputBoxes()
            mockGetEventBox(anything(), eventBoxAndCommitments[0])
            mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1))
            mockGetRSNRatioCoef(anything(), [BigInt(0), BigInt(100000)])
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Erg payment tx that transferring token", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockTokenTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx with no token transferring", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockErgTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring multiple tokens", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockMultipleTokensTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that transferring wrong token", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockWrongTokenTransferringPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    RewardBoxes
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that distributing reward to wrong WID", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger()
            const tx = TestBoxes.mockTransferToIllegalWIDTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    RewardBoxes
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that missing a valid commitment box when distributing rewards", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger()
            const tx = TestBoxes.mockMissingValidCommitmentTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments.slice(0, eventBoxAndCommitments.length - 1))

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a token payment tx that burning some token", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject a erg payment tx that burning some token", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningErgPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an only RSN payment tx that transferring wrong amount", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger()
            const tx = TestBoxes.mockWrongAmountRSNOnlyPaymentTransaction(mockedEvent, eventBoxAndCommitments)
            const spiedErgoConfig = spy(ErgoConfigs)
            mockGetRSNRatioCoef(anything(), [BigInt(47), BigInt(100000)])
            when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n)
            when(spiedErgoConfig.watchersSharePercent).thenReturn(0n)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

    describe("verifyEventWithPayment", () => {
        const observationTx = JSON.parse(TestData.mockedObservationTx)
        const nonObservationTx = JSON.parse(TestData.mockedNonObservationTx)
        const ergObservationTx = JSON.parse(TestData.mockedErgObservationTx)

        beforeEach("mock ExplorerApi", function () {
            resetMockedExplorerApi()
            mockExplorerGetConfirmedTx(observationTx.id, observationTx)
            mockExplorerGetConfirmedTx(nonObservationTx.id, nonObservationTx)
            mockExplorerGetConfirmedTx(ergObservationTx.id, ergObservationTx)
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should verify the event
         */
        it("should return true when the event is correct", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.true
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should verify the event
         */
        it("should return true when the event locking erg is correct", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockValidErgEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.true
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with toChain", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidToChainEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with toAddress", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidToAddressEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with amount", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidAmountEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with bridgeFee", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidBridgeFeeEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with networkFee", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidNetworkFeeEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with sourceTokenId", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidSourceTokenEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with targetTokenId", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidTargetTokenEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with blockId", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidBlockEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event is incorrect with sourceTxId", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockInvalidTxEventTrigger()

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyEventWithPayment
         * Dependencies:
         *    ErgoUtils
         * Expected Output:
         *    It should NOT verify the event
         */
        it("should return false when the event can not recovered from tx", async () => {
            const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger()
            sinon.stub(ErgoUtils, "getRosenData").returns(undefined)

            // run test
            const ergoChain: ErgoChain = new ErgoChain()
            const isValid = await ergoChain.verifyEventWithPayment(mockedEvent)
            expect(isValid).to.be.false
        })
    })

})
