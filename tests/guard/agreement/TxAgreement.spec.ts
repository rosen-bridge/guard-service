import {
    verifySendMessageCalledOnce, verifySendMessageCalledTwice, verifySendMessageDidntGetCalled,
    verifySendMessageWithReceiverCalledOnce
} from "../../communication/mocked/MockedDialer";
import ErgoTestBoxes from "../../chains/ergo/testUtils/TestBoxes";
import { EventTrigger } from "../../../src/models/Models";
import TxAgreement from "../../../src/guard/agreement/TxAgreement";
import { anything, deepEqual, reset, spy, verify, when } from "ts-mockito";
import CardanoTestBoxes from "../../chains/cardano/testUtils/TestBoxes";
import Configs from "../../../src/helpers/Configs";
import TestUtils from "../../testUtils/TestUtils";
import {
    allEventRecords,
    clearEventTable,
    insertEventRecord
} from "../../db/mocked/MockedScannerModel";
import {
    mockIsEventConfirmedEnough,
    mockVerifyPaymentTransactionWithEvent,
    resetMockedEventProcessor
} from "../mocked/MockedEventProcessor";
import { mockGuardTurn } from "../../testUtils/MockedUtils";
import { AgreementPayload, GuardsAgreement, TransactionApproved } from "../../../src/guard/agreement/Interfaces";
import { expect } from "chai";

describe("TxAgreement", () => {
    const eventBoxAndCommitments = ErgoTestBoxes.mockEventBoxWithSomeCommitments()

    describe("startAgreementProcess", () => {

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    -
         * Expected Output:
         *    The function should broadcast tx agreement request to other guards
         */
        it("should broadcast agreement request for the transaction", () => {
            // mock an event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)

            // verify out request
            verifySendMessageCalledOnce("tx-agreement", {
                "type": "request",
                "payload": {
                    "txJson": tx.toJson(),
                    "guardId": 1,
                    "signature": anything()
                }
            })
        })

    })

    describe("processTransactionRequest", () => {

        beforeEach("clear scanner database tables", () => {
            clearEventTable()
            resetMockedEventProcessor()
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    KoiosApi
         *    scannerAction
         * Expected Output:
         *    The function should agree with request
         */
        it("should agree with request", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent, "", tx.txId, tx.toJson())

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyPaymentTransactionWithEvent(tx, mockedEvent,true)

            // mock guard turn
            mockGuardTurn(0)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify out request
            verifySendMessageWithReceiverCalledOnce("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": tx.signMetaData(),
                    "txId": tx.txId,
                    "agreed": true
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "agreed", tx.txId, tx.toJson()])
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should not respond to request
         */
        it("should not respond to request when event doesn't exist in db", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockWrongAmountTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify no agree or reject out request
            verifySendMessageDidntGetCalled("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": tx.signMetaData(),
                    "txId": tx.txId,
                    "agreed": true
                }
            }, receiver)
            verifySendMessageDidntGetCalled("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.length).to.equal(0)
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         * Expected Output:
         *    The function should not respond to request
         */
        it("should not respond to request when event doesn't confirmed enough", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            const tx = ErgoTestBoxes.mockWrongAmountTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, false)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify no agree or reject out request
            verifySendMessageDidntGetCalled("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": tx.signMetaData(),
                    "txId": tx.txId,
                    "agreed": true
                }
            }, receiver)
            verifySendMessageDidntGetCalled("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", null, null])
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when signature doesn't verify", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            const tx = ErgoTestBoxes.mockWrongTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)

            // generate test data
            const senderId = 0
            const wrongSenderId = 2
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, wrongSenderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify out request
            verifySendMessageWithReceiverCalledOnce("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", null, null])
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         *    eventProcessor
         *    Utils
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when its not creator guard turn", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            await insertEventRecord(mockedEvent, "")
            const tx = ErgoTestBoxes.mockIllegalChangeBoxDistributionTransaction(mockedEvent, eventBoxAndCommitments)

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)

            // mock guard turn
            mockGuardTurn(1)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify out request
            verifySendMessageWithReceiverCalledOnce("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", null, null])
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         *    eventProcessor
         *    Utils
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when event already has transaction", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockMissingValidCommitmentDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            const previousTxId = TestUtils.generateRandomId()
            await insertEventRecord(mockedEvent, "", previousTxId, "testTx")

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)

            // mock guard turn
            mockGuardTurn(0)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify out request
            verifySendMessageWithReceiverCalledOnce("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", previousTxId, "testTx"])
        })

        /**
         * Target: testing processTransactionRequest
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         *    Utils
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when tx doesn't verify event condition", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockTransferToIllegalWIDDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            await insertEventRecord(mockedEvent, "")

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyPaymentTransactionWithEvent(tx, mockedEvent,false)

            // mock guard turn
            mockGuardTurn(0)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            // verify out request
            verifySendMessageWithReceiverCalledOnce("tx-agreement", {
                "type": "response",
                "payload": {
                    "guardId": Configs.guardId,
                    "signature": "",
                    "txId": tx.txId,
                    "agreed": false
                }
            }, receiver)
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.status, event.txId, event.paymentTxJson])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", null, null])
        })

    })

    describe("processAgreementResponse", () => {

        beforeEach("clear scanner database tables", () => {
            clearEventTable()
        })

        /**
         * Target: testing processAgreementResponse
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should set the transaction as approved when the majority of guards agreed", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockTokenTransferringErgDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            await insertEventRecord(mockedEvent, "", tx.txId, tx.toJson())

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)
            const agreements: AgreementPayload[] = [{
                "guardId": Configs.guardId,
                "signature": tx.signMetaData()
            }]

            // simulate 4 agreements
            for (let i = 0; i < 4; i++) {
                if (i == 1) continue
                const senderId = i
                const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
                await txAgreement.processAgreementResponse(tx.txId, true, senderId, guardSignature)
                agreements.push({
                    "guardId": senderId,
                    "signature": guardSignature
                })
            }
            // simulate duplicate agreement
            let senderId = 2
            let guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            await txAgreement.processAgreementResponse(tx.txId, true, senderId, guardSignature)

            // run test
            senderId = 6
            guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            await txAgreement.processAgreementResponse(tx.txId, true, senderId, guardSignature)
            agreements.push({
                "guardId": senderId,
                "signature": guardSignature
            })

            // verify
            verifySendMessageCalledOnce("tx-agreement", {
                "type": "approval",
                "payload": {
                    "txJson": tx.toJson(),
                    "guardsSignatures": agreements
                }
            })
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.txId, event.status])[0])
                .to.deep.equal([mockedEvent.sourceTxId, tx.txId, "approved"])
        })

        /**
         * Target: testing processAgreementResponse
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         *    Utils
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should not set the transaction as approved when it is impossible that minimum guards agree with it", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockTokenBurningErgDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            await insertEventRecord(mockedEvent, "", tx.txId, tx.toJson())

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)
            const rejects = []

            // simulate 2 reject response
            for (let i = 0; i < 3; i++) {
                if (i == 1) continue
                const senderId = i
                await txAgreement.processAgreementResponse(tx.txId, false, senderId, "")
                rejects.push(senderId)
            }
            // simulate 1 agreement
            let senderId = 4
            await txAgreement.processAgreementResponse(tx.txId, true, senderId, TestUtils.signTxMetaData(tx.txBytes, senderId))
            // simulate duplicate reject
            senderId = 2
            await txAgreement.processAgreementResponse(tx.txId, false, senderId, "")

            // run test
            senderId = 6
            await txAgreement.processAgreementResponse(tx.txId, false, senderId, "")
            rejects.push(senderId)

            // verify
            verifySendMessageDidntGetCalled("tx-agreement", {
                "type": "approval",
                "payload": {
                    "txId": tx.txId,
                    "guardsSignatures": anything()
                }
            })
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.txId, event.status])[0])
                .to.deep.equal([mockedEvent.sourceTxId, "", ""])
        })

    })

    describe("processApprovalMessage", () => {

        beforeEach("clear scanner database tables", () => {
            clearEventTable()
            resetMockedEventProcessor()
        })

        /**
         * Target: testing processApprovalMessage
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         *    Utils
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should set the transaction as approved when the majority of guards signatures verify", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent, "")

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyPaymentTransactionWithEvent(tx, mockedEvent,true)

            // mock guard turn
            mockGuardTurn(0)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // initialize tx array
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            const agreements: AgreementPayload[] = []
            for (let i = 2; i < 7; i++) {
                agreements.push({
                    "guardId": i,
                    "signature": TestUtils.signTxMetaData(tx.txBytes, i)
                })
            }

            // run test
            await txAgreement.processApprovalMessage(tx, agreements, "testSender")

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.txId, event.status])[0])
            .to.deep.equal([mockedEvent.sourceTxId, tx.txId, "approved"])
        })

        /**
         * Target: testing processApprovalMessage
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         *    Utils
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should set the transaction as approved even when the majority of other guards agreed", async () => {
            // mock event and tx
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent, "")

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyPaymentTransactionWithEvent(tx, mockedEvent,true)

            // mock guard turn
            mockGuardTurn(0)

            // initialize tx array
            const txAgreement = new TxAgreement()

            const agreements: AgreementPayload[] = []
            for (let i = 2; i < 7; i++) {
                agreements.push({
                    "guardId": i,
                    "signature": TestUtils.signTxMetaData(tx.txBytes, i)
                })
            }

            // run test
            await txAgreement.processApprovalMessage(tx, agreements, "testSender")

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.txId, event.status])[0])
                .to.deep.equal([mockedEvent.sourceTxId, tx.txId, "approved"])
        })

        /**
         * Target: testing processApprovalMessage
         * Dependencies:
         *    scannerAction
         *    EventProcessor
         *    Utils
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should not set the transaction as approved when at least one guard signature doesn't verify", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenPaymentEventTrigger()
            const tx = ErgoTestBoxes.mockTokenBurningErgPaymentTransaction(mockedEvent, eventBoxAndCommitments)
            await insertEventRecord(mockedEvent, "")

            // mock isConfirmedEnough
            mockIsEventConfirmedEnough(mockedEvent, true)
            mockVerifyPaymentTransactionWithEvent(tx, mockedEvent,true)

            // mock guard turn
            mockGuardTurn(0)

            // generate test data
            const senderId = 0
            const guardSignature = TestUtils.signTxMetaData(tx.txBytes, senderId)
            const receiver = "testReceiver"

            // initialize tx array
            const txAgreement = new TxAgreement()
            await txAgreement.processTransactionRequest(tx, senderId, guardSignature, receiver)

            const agreements: AgreementPayload[] = []
            for (let i = 2; i < 7; i++) {
                if (i == 4) {
                    const wrongSenderId = 0
                    agreements.push({
                        "guardId": i,
                        "signature": TestUtils.signTxMetaData(tx.txBytes, wrongSenderId)
                    })
                }
                else {
                    agreements.push({
                        "guardId": i,
                        "signature": TestUtils.signTxMetaData(tx.txBytes, i)
                    })
                }
            }

            // run test
            await txAgreement.processApprovalMessage(tx, agreements, "testSender")

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.map(event => [event.sourceTxId, event.txId, event.status])[0])
                .to.deep.equal([mockedEvent.sourceTxId, tx.txId, "agreed"])
        })

    })

    describe("resendTransactionRequests", () => {

        /**
         * Target: testing resendTransactionRequests
         * Dependencies:
         *    -
         * Expected Output:
         *    The function should resend tx request
         */
        it("should rebroadcast agreement request for all active transactions", () => {
            // mock token payment event
            const mockedEvent1: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx1 = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent1, CardanoTestBoxes.testBankAddress)
            const mockedEvent2: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx2 = CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent2, CardanoTestBoxes.testBankAddress)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx1)
            txAgreement.startAgreementProcess(tx2)

            // run test
            txAgreement.resendTransactionRequests()

            // verify
            verifySendMessageCalledTwice("tx-agreement", {
                "type": "request",
                "payload": {
                    "txJson": tx1.toJson(),
                    "guardId": 1,
                    "signature": anything()
                }
            })
            verifySendMessageCalledTwice("tx-agreement", {
                "type": "request",
                "payload": {
                    "txJson": tx2.toJson(),
                    "guardId": 1,
                    "signature": anything()
                }
            })
        })

    })

    describe("clearAgreedTransactions", () => {

        beforeEach("clear scanner database tables", () => {
            clearEventTable()
        })

        /**
         * Target: testing clearAgreedTransactions
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should delete some tx from db
         */
        it("should remove agreed status, txId and txJson for all event with agreed status", async () => {
            // mock token payment event
            const mockedEvent1: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx1 = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent1, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent1, "agreed", tx1.txId, tx1.toJson())

            const mockedEvent2: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx2 = CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent2, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent2, "agreed", tx2.txId, tx2.toJson())

            const mockedEvent3: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx3 = CardanoTestBoxes.mockTwoAssetsTransferringPaymentTransaction(mockedEvent3, CardanoTestBoxes.testBankAddress)
            await insertEventRecord(mockedEvent3, "approved", tx3.txId, tx3.toJson())

            const mockedEvent4: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            await insertEventRecord(mockedEvent4, "")

            // run test
            const txAgreement = new TxAgreement()
            await txAgreement.clearAgreedTransactions()

            // verify
            const dbEvents = await allEventRecords()
            expect(dbEvents.filter(event => event.status === "agreed").length).to.equal(0)
            expect(dbEvents.filter(event => event.status === "approved").length).to.equal(1)
            expect(dbEvents.filter(event => event.status === "").length).to.equal(3)
        })

    })

    describe("handleMessage", () => {
        const channel = "tx-agreement"

        /**
         * Target: testing handleMessage
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should call corresponding handler method
         */
        it("should call processTransactionRequest for request type messages", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)

            // generate test data
            const signature = "guardSignature"
            const sender = "testSender"
            const candidatePayload = {
                "txJson": tx.toJson(),
                "guardId": 0,
                "signature": signature
            }
            const message = {
                "type": "request",
                "payload": candidatePayload
            }

            // run test
            const txAgreement = new TxAgreement()
            const spiedTxAgreement = spy(txAgreement)
            when(spiedTxAgreement.processTransactionRequest(anything(), anything(), anything(), anything())).thenResolve()
            await txAgreement.handleMessage(JSON.stringify(message), channel, sender)

            // verify
            //  Note: deepEqual doesn't work for PaymentTransaction object either. So, anything() used.
            verify(spiedTxAgreement.processTransactionRequest(anything(), 0, signature, sender)).once()
            reset(spiedTxAgreement)
        })

        /**
         * Target: testing handleMessage
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should call corresponding handler method
         */
        it("should call processAgreementResponse for response type messages", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)

            // generate test data
            const signature = "guardSignature"
            const sender = "testSender"
            const agreementPayload: GuardsAgreement = {
                "guardId": 0,
                "signature": signature,
                "txId": tx.txId,
                "agreed": true
            }
            const message = {
                "type": "response",
                "payload": agreementPayload
            }

            // run test
            const txAgreement = new TxAgreement()
            const spiedTxAgreement = spy(txAgreement)
            when(spiedTxAgreement.processAgreementResponse(anything(), anything(), anything(), anything())).thenResolve()
            await txAgreement.handleMessage(JSON.stringify(message), channel, sender)

            // verify
            verify(spiedTxAgreement.processAgreementResponse(tx.txId, true, 0, signature)).once()
            reset(spiedTxAgreement)
        })

        /**
         * Target: testing handleMessage
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should call corresponding handler method
         */
        it("should call processAgreementResponse for response type messages", async () => {
            // mock token payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockAssetPaymentEventTrigger()
            const tx = CardanoTestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, CardanoTestBoxes.testBankAddress)

            // generate test data
            const signatures = [
                {
                    "guardId": 0,
                    "signature": "sig0"
                },
                {
                    "guardId": 1,
                    "signature": "sig1"
                }
            ]
            const sender = "testSender"
            const txApproval: TransactionApproved = {
                "txJson": tx.toJson(),
                "guardsSignatures": signatures
            }
            const message = {
                "type": "approval",
                "payload": txApproval
            }

            // run test
            const txAgreement = new TxAgreement()
            const spiedTxAgreement = spy(txAgreement)
            when(spiedTxAgreement.processApprovalMessage(anything(), anything(), anything())).thenResolve()
            await txAgreement.handleMessage(JSON.stringify(message), channel, sender)

            // verify
            //  Note: deepEqual doesn't work for PaymentTransaction object either. So, anything() used.
            verify(spiedTxAgreement.processApprovalMessage(anything(), deepEqual(signatures), sender)).once()
            reset(spiedTxAgreement)
        })

    })

})
