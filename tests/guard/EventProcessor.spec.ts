import { mockExplorerGetTxConfirmation } from "../chains/ergo/mocked/MockedExplorer";
import { expect } from "chai";
import { EventTrigger } from "../../src/models/Models";
import TestUtils from "../testUtils/TestUtils";
import EventProcessor from "../../src/guard/EventProcessor";
import { mockKoiosGetTxConfirmation } from "../chains/cardano/mocked/MockedKoios";
import {
    mockIsEventConfirmedEnough, mockVerifyEvent,
    resetMockedEventProcessor, verifyCreateEventPaymentCalledOnce,
    verifyCreateEventPaymentDidntGetCalled
} from "./mocked/MockedEventProcessor";
import CardanoTestBoxes from "../chains/cardano/testUtils/TestBoxes";
import { allEventRecords, clearEventTable, insertEventRecord } from "../db/mocked/MockedScannerModel";
import {
    mockStartAgreementProcess,
    resetMockedTxAgreement,
    verifyStartAgreementProcessCalledOnce
} from "./mocked/MockedTxAgreement";
import MockedCardanoChain from "../chains/mocked/MockedCardanoChain";
import MockedErgoChain from "../chains/mocked/MockedErgoChain";
import ErgoTestBoxes from "../chains/ergo/testUtils/TestBoxes";
import TestBoxes from "../chains/ergo/testUtils/TestBoxes";
import { scannerAction } from "../../src/db/models/scanner/ScannerModel";

describe("EventProcessor", () => {
    const cardanoTestBankAddress = CardanoTestBoxes.testBankAddress
    const ergoEventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()

    const mockedCardanoChain = new MockedCardanoChain(EventProcessor.cardanoChain)
    const mockedErgoChain = new MockedErgoChain(EventProcessor.ergoChain)

    describe("isEventConfirmedEnough", () => {

        beforeEach("reset isEventConfirmedEnough mock", () => {
            resetMockedEventProcessor()
        })

        /**
         * Target: testing isEventConfirmedEnough
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should return true
         */
        it("should return true when event confirmed enough in ergo", async () => {
            const txId = TestUtils.generateRandomId()
            const fromErgoEventTrigger = new EventTrigger("ergo", "", "",
                "", "", "", "", "",
                "", txId, "", []
            )
            mockExplorerGetTxConfirmation(txId, 30)

            // run test
            const result = await EventProcessor.isEventConfirmedEnough(fromErgoEventTrigger)
            expect(result).to.be.true
        })

        /**
         * Target: testing isEventConfirmedEnough
         * Dependencies:
         *    KoiosApi
         * Expected Output:
         *    The function should return true
         */
        it("should return true when event confirmed enough in cardano", async () => {
            const txId = TestUtils.generateRandomId()
            const fromCardanoEventTrigger = new EventTrigger("cardano", "", "",
                "", "", "", "", "",
                "", txId, "", []
            )
            mockKoiosGetTxConfirmation(txId, 30)

            // run test
            const result = await EventProcessor.isEventConfirmedEnough(fromCardanoEventTrigger)
            expect(result).to.be.true
        })

    })

    describe("processEvent", () => {

        beforeEach("reset isEventConfirmedEnough mock", async () => {
            await clearEventTable()
            resetMockedEventProcessor()
            resetMockedTxAgreement()
        })

        /**
         * Target: testing processEvent
         * Dependencies:
         *    EventProcessor
         * Expected Output:
         *    The function should do nothing
         */
        it("should do nothing when event is not confirmed enough", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            mockIsEventConfirmedEnough(mockedEvent, false)

            // run test
            await EventProcessor.processEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentDidntGetCalled(mockedEvent)
        })

        /**
         * Target: testing processEvent
         * Dependencies:
         *    EventProcessor
         * Expected Output:
         *    The function should update event info in db
         */
        it("should mark event as rejected when didn't verify on source chain", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyEvent(mockedEvent, false)

            // run test
            await EventProcessor.processEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentDidntGetCalled(mockedEvent)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "rejected"])
        })

        /**
         * Target: testing processEvent
         * Dependencies:
         *    EventProcessor
         *    CardanoChain
         *    txAgreement
         * Expected Output:
         *    The function should create tx
         *    The function should start agreement process
         */
        it("should create cardano tx for event and send to agreement process", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyEvent(mockedEvent, true)

            // mock tx
            const tx = CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent, cardanoTestBankAddress)
            mockedCardanoChain.mockGenerateTransaction(mockedEvent, tx)
            mockStartAgreementProcess(tx)

            // run test
            await EventProcessor.processEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentCalledOnce(mockedEvent)
            verifyStartAgreementProcessCalledOnce(tx)
        })

        /**
         * Target: testing processEvent
         * Dependencies:
         *    EventProcessor
         *    ErgoChain
         *    txAgreement
         * Expected Output:
         *    The function should create tx
         *    The function should start agreement process
         */
        it("should create ergo tx for event and send to agreement process", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyEvent(mockedEvent, true)

            // mock tx
            const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, ergoEventBoxAndCommitments)
            mockedErgoChain.mockGenerateTransaction(mockedEvent, tx)
            mockStartAgreementProcess(tx)

            // run test
            await EventProcessor.processEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentCalledOnce(mockedEvent)
            verifyStartAgreementProcessCalledOnce(tx)
        })

    })

})
