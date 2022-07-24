import { expect } from "chai";
import {
    mockExplorerGetTxConfirmation, mockIsBoxUnspentAndValid,
    mockIsTxInMempool,
    resetMockedExplorerApi
} from "../chains/ergo/mocked/MockedExplorer";
import { EventTrigger } from "../../src/models/Models";
import ErgoTestBoxes from "../chains/ergo/testUtils/TestBoxes";
import {
    allEventRecords, allTxRecords,
    clearEventTable,
    clearTxTable,
    insertEventRecord,
    insertTxRecord
} from "../db/mocked/MockedScannerModel";
import TestConfigs from "../testUtils/TestConfigs";
import TransactionProcessor from "../../src/guard/TransactionProcessor";
import { ErgoBox } from "ergo-lib-wasm-nodejs";
import {
    mockSubmitTransactionToChain,
    resetMockedEventProcessor,
    verifySubmitTransactionToChainCalledOnce
} from "./mocked/MockedEventProcessor";
import CardanoTestBoxes from "../chains/cardano/testUtils/TestBoxes";
import { mockKoiosGetTxConfirmation } from "../chains/cardano/mocked/MockedKoios";

describe("TransactionProcessor", () => {

    describe("processSentTx", () => {

        describe("for Ergo txs", () => {
            const ergoBlockchainHeight = TestConfigs.ergo.blockchainHeight
            const eventBoxAndCommitments = ErgoTestBoxes.mockEventBoxWithSomeCommitments()

            beforeEach("clear database tables", async () => {
                await clearTxTable()
                await clearEventTable()
                resetMockedExplorerApi()
                resetMockedEventProcessor()
            })

            /**
             * Target: testing processSentTx (processErgoTx)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should set tx and event as completed when tx confirmed enough", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", "ergo", "sent", ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, "completed"])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, "completed"])
            })

            /**
             * Target: testing processSentTx (processErgoTx)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should update lastCheck when tx is mined but isn't confirmed enough", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", "ergo", "sent", ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, 5)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, "sent", ergoBlockchainHeight])
            })

            /**
             * Target: testing processSentTx (processErgoTx)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should update lastCheck when tx is in mempool", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", "ergo", "sent", ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, true)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, "sent", ergoBlockchainHeight])
            })

            /**
             * Target: testing processSentTx (processErgoTxInputs)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             *    EventProcessor
             * Expected Output:
             *    The function should update db
             */
            it("should resend tx when it isn't in mempool but all inputs are valid", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", "ergo", "sent", ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, false)

                // mock validation of tx input boxes
                tx.inputBoxes.map(boxBytes => {
                    const box = ErgoBox.sigma_parse_bytes(boxBytes)
                    mockIsBoxUnspentAndValid(box.box_id().to_str(), true)
                })
                mockSubmitTransactionToChain(tx, "ergo")

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                verifySubmitTransactionToChainCalledOnce(tx, "ergo")
            })

        })

        describe("for Cardano txs", () => {
            const cardanoBlockchainHeight = TestConfigs.cardano.blockchainHeight
            const testBankAddress = CardanoTestBoxes.testBankAddress

            beforeEach("clear database tables", async () => {
                await clearTxTable()
                await clearEventTable()
                resetMockedEventProcessor()
            })

            /**
             * Target: testing processSentTx (processCardanoTx)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should set tx as completed and set event as pending-reward when payment tx confirmed enough", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "payment", "cardano", "sent", cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, "pending-reward"])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, "completed"])
            })

            /**
             * Target: testing processSentTx (processCardanoTx)
             * Dependencies:
             *    KoiosApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should set tx and event as completed when reward tx confirmed enough", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
                await insertEventRecord(mockedEvent, "in-reward")
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "reward", "cardano", "sent", cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, "completed"])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, "completed"])
            })

            /**
             * Target: testing processSentTx (processCardanoTx)
             * Dependencies:
             *    KoiosApi
             *    scannerAction
             * Expected Output:
             *    The function should update db
             */
            it("should update lastCheck when tx is mined but isn't confirmed enough", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
                await insertEventRecord(mockedEvent, "in-payment")
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "payment", "cardano", "sent", cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 5)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, "sent", cardanoBlockchainHeight])
            })

        })

    })

})
