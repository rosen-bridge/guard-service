import { expect } from "chai";
import { verifySendMessageCalledOnce } from "../../communication/mocked/MockedDialer";
import TestBoxes from "../../chains/ergo/testUtils/TestBoxes";
import { EventTrigger } from "../../../src/models/Models";
import TxAgreement from "../../../src/guard/agreement/TxAgreement";
import { anything } from "ts-mockito";

describe("TxAgreement", () => {
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments()

    describe("startAgreementProcess", () => {

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    Dialer
         * Expected Output:
         *    The function should broadcast tx agreement request to other guards
         */
        it("should broadcast agreement request for the transaction", () => {
            // mock an event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // run test
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)

            // verify out request
            verifySendMessageCalledOnce("tx-agreement", {
                "type": "request",
                "payload": {
                    "tx": tx.toJson(),
                    "guardId": 1,
                    "signature": anything()
                }
            })
        })

    })

    describe("processTransactionRequest", () => {

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should agree with request
         */
        it("should agree with request", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should not respond to request
         */
        it("should not respond to request when event doesn't exist in db", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should not respond to request
         */
        it("should not respond to request when event doesn't confirmed enough", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when signature doesn't verify", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when its not creator guard turn", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when event already has transaction", () => {
            // TODO
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should reject the request
         */
        it("should reject the request when tx doesn't verify event condition", () => {
            // TODO
        })

    })

    describe("processAgreementResponse", () => {

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should set the transaction as approved when the majority of guards agreed", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)
            // call handleMessage multiple times

            // run test TODO
            // call handleMessage as the last request and verify changes
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should not set the transaction as approved when it is impossible that minimum guards agree with it", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)
            // call handleMessage multiple times

            // run test TODO
            // call handleMessage as the last request and verify changes
        })

    })

    describe("processApprovalMessage", () => {

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should set the transaction as approved when the majority of guards signatures verify", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)

            // run test TODO
            // call handleMessage with the approval message

            // verify
        })

        /**
         * Target: testing startAgreementProcess
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should set tx as approved
         */
        it("should not set the transaction as approved when at least one guard signature doesn't verify", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)

            // run test TODO
            // call handleMessage with the approval message

            // verify
        })

    })

    describe("resendTransactionRequests", () => {

        /**
         * Target: testing resendTransactionRequests
         * Dependencies:
         *    ExplorerApi
         * Expected Output:
         *    The function should resend tx request
         */
        it("should rebroadcast agreement request for all active transactions", () => {
            // mock token payment event
            const mockedEvent: EventTrigger = TestBoxes.mockTokenPaymentEventTrigger()
            const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(mockedEvent, eventBoxAndCommitments)

            // initialize tx array
            const txAgreement = new TxAgreement()
            txAgreement.startAgreementProcess(tx)

            // run test TODO
            // call handleMessage with the approval message

            // verify
        })

    })

})
