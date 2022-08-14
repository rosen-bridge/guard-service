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
import {
    allEventRecords,
    clearTables,
    insertEventRecord,
    insertOnyEventDataRecord
} from "../db/mocked/MockedScannerModel";
import {
    mockStartAgreementProcess,
    resetMockedTxAgreement,
    verifyStartAgreementProcessCalledOnce
} from "./mocked/MockedTxAgreement";
import MockedCardanoChain from "../chains/mocked/MockedCardanoChain";
import MockedErgoChain from "../chains/mocked/MockedErgoChain";
import ErgoTestBoxes from "../chains/ergo/testUtils/TestBoxes";
import TestBoxes from "../chains/ergo/testUtils/TestBoxes";
import ChainsConstants from "../../src/chains/ChainsConstants";
import { mockRewardGenerateTransaction, resetMockedReward } from "../chains/mocked/MockedReward";

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
            const fromErgoEventTrigger = new EventTrigger(ChainsConstants.ergo, "", "",
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
            const fromCardanoEventTrigger = new EventTrigger(ChainsConstants.cardano, "", "",
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
            await clearTables()
            resetMockedEventProcessor()
            resetMockedTxAgreement()
        })

        /**
         * Target: testing processPaymentEvent
         * Dependencies:
         *    EventProcessor
         * Expected Output:
         *    The function should update event info in db
         */
        it("should mark event as rejected when didn't verify on source chain", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "pending-payment")
            mockVerifyEvent(mockedEvent, false)

            // run test
            await EventProcessor.processConfirmedEvents()

            // verify
            verifyCreateEventPaymentDidntGetCalled(mockedEvent)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.id, event.status])[0])
                .to.deep.equal([mockedEvent.getId(), "rejected"])
        })

        /**
         * Target: testing processPaymentEvent
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
            await insertEventRecord(mockedEvent, "pending-payment")
            mockVerifyEvent(mockedEvent, true)

            // mock tx
            const tx = CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent, cardanoTestBankAddress)
            mockedCardanoChain.mockGenerateTransaction(mockedEvent, tx)
            mockStartAgreementProcess(tx)

            // run test
            await EventProcessor.processPaymentEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentCalledOnce(mockedEvent)
            verifyStartAgreementProcessCalledOnce(tx)
        })

        /**
         * Target: testing processPaymentEvent
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
            await insertEventRecord(mockedEvent, "pending-payment")
            mockVerifyEvent(mockedEvent, true)

            // mock tx
            const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, ergoEventBoxAndCommitments)
            mockedErgoChain.mockGenerateTransaction(mockedEvent, tx)
            mockStartAgreementProcess(tx)

            // run test
            await EventProcessor.processPaymentEvent(mockedEvent)

            // verify
            verifyCreateEventPaymentCalledOnce(mockedEvent)
            verifyStartAgreementProcessCalledOnce(tx)
        })

    })

    describe("processRewardEvent", () => {

        beforeEach("clear db tables", async () => {
            await clearTables()
            resetMockedEventProcessor()
            resetMockedReward()
        })

        /**
         * Target: testing processRewardEvent
         * Dependencies:
         *    Reward
         *    txAgreement
         * Expected Output:
         *    The function should create tx
         *    The function should start agreement process
         */
        it("should create reward distribution tx for event and send to agreement process", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
            await insertEventRecord(mockedEvent, "pending-reward")

            // mock tx
            const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, ergoEventBoxAndCommitments)
            mockRewardGenerateTransaction(mockedEvent, tx)
            mockStartAgreementProcess(tx)

            // run test
            await EventProcessor.processConfirmedEvents()

            // verify
            verifyCreateEventPaymentCalledOnce(mockedEvent)
            verifyStartAgreementProcessCalledOnce(tx)
        })

    })

    describe("processScannedEvents", () => {

        beforeEach("clear db tables", async () => {
            await clearTables()
            resetMockedEventProcessor()
        })

        /**
         * Target: testing processScannedEvents
         * Dependencies:
         *    isEventConfirmedEnough
         *    dbAction
         * Scenario:
         *    Insert two mocked event box into db
         *    Mock one of them as confirmed and the other as not confirmed
         *    Run test
         *    Expect to see only confirmed event in ConfirmedEvent table of db
         * Expected Output:
         *    The function should insert just one event into db
         */
        it("should inserts confirmed events into ConfirmedEvent table", async () => {
            const mockedEvent1 = TestBoxes.mockErgPaymentEventTrigger()
            const mockedEvent2 = TestBoxes.mockErgPaymentEventTrigger()
            await insertOnyEventDataRecord(mockedEvent1)
            mockIsEventConfirmedEnough(mockedEvent1, true)
            await insertOnyEventDataRecord(mockedEvent2)
            mockIsEventConfirmedEnough(mockedEvent2, false)

            // run test
            await EventProcessor.processScannedEvents()

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.length).to.equal(1)
            expect(dbEvents[0].id).to.equal(mockedEvent1.getId())
        })

        /**
         * Target: testing processScannedEvents
         * Dependencies:
         *    isEventConfirmedEnough
         *    dbAction
         * Scenario:
         *    Insert a mocked event box into db twice
         *    Mock it as confirmed
         *    Run test
         *    Expect to see only confirmed event in ConfirmedEvent table of db
         * Expected Output:
         *    The function should insert just one event into db
         */
        it("should only inserts one event per sourceTxId into ConfirmedEvent table", async () => {
            const mockedEvent = TestBoxes.mockErgPaymentEventTrigger()
            await insertOnyEventDataRecord(mockedEvent)
            await insertOnyEventDataRecord(mockedEvent)
            mockIsEventConfirmedEnough(mockedEvent, true)

            // run test
            await EventProcessor.processScannedEvents()

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.length).to.equal(1)
            expect(dbEvents[0].id).to.equal(mockedEvent.getId())
        })

    })

})
