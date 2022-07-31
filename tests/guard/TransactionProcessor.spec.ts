import { expect } from "chai";
import {
    mockExplorerGetTxConfirmation, mockIsBoxUnspentAndValid,
    mockIsTxInMempool,
    resetMockedExplorerApi
} from "../chains/ergo/mocked/MockedExplorer";
import { EventStatus, EventTrigger, TransactionStatus } from "../../src/models/Models";
import ErgoTestBoxes from "../chains/ergo/testUtils/TestBoxes";
import {
    allEventRecords, allTxRecords, clearTables,
    insertEventRecord,
    insertTxRecord
} from "../db/mocked/MockedScannerModel";
import TestConfigs from "../testUtils/TestConfigs";
import TransactionProcessor from "../../src/guard/TransactionProcessor";
import { ErgoBox } from "ergo-lib-wasm-nodejs";
import { resetMockedEventProcessor } from "./mocked/MockedEventProcessor";
import CardanoTestBoxes from "../chains/cardano/testUtils/TestBoxes";
import { mockKoiosGetTxConfirmation } from "../chains/cardano/mocked/MockedKoios";
import MockedErgoChain from "../chains/mocked/MockedErgoChain";
import MockedCardanoChain from "../chains/mocked/MockedCardanoChain";
import ErgoConfigs from "../../src/chains/ergo/helpers/ErgoConfigs";
import MockedBlockFrost from "../chains/cardano/mocked/MockedBlockFrost";
import CardanoConfigs from "../../src/chains/cardano/helpers/CardanoConfigs";
import ChainsConstants from "../../src/chains/ChainsConstants";

describe("TransactionProcessor", () => {

    const mockedCardanoChain = new MockedCardanoChain(TransactionProcessor.cardanoChain)
    const mockedErgoChain = new MockedErgoChain(TransactionProcessor.ergoChain)

    describe("processSentTx", () => {

        describe("for Ergo txs", () => {
            const ergoBlockchainHeight = TestConfigs.ergo.blockchainHeight
            const eventBoxAndCommitments = ErgoTestBoxes.mockEventBoxWithSomeCommitments()

            beforeEach("clear database tables", async () => {
                await clearTables()
                resetMockedExplorerApi()
                resetMockedEventProcessor()
                mockedErgoChain.resetMockCalls()
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
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", ChainsConstants.ergo, TransactionStatus.sent, ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.completed])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.completed])
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
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", ChainsConstants.ergo, TransactionStatus.sent, ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, 5)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.sent, ergoBlockchainHeight])
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
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", ChainsConstants.ergo, TransactionStatus.sent, ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, true)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.sent, ergoBlockchainHeight])
            })

            /**
             * Target: testing processSentTx (processErgoTxInputs)
             * Dependencies:
             *    ExplorerApi
             *    scannerAction
             *    EventProcessor
             * Expected Output:
             *    The function should send request
             */
            it("should resend tx when it isn't in mempool but all inputs are valid", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                await insertTxRecord(tx, "payment", ChainsConstants.ergo, TransactionStatus.sent, ergoBlockchainHeight - 2, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, false)
                mockedErgoChain.mockSubmitTransaction(tx)

                // mock validation of tx input boxes
                tx.inputBoxes.map(boxBytes => {
                    const box = ErgoBox.sigma_parse_bytes(boxBytes)
                    mockIsBoxUnspentAndValid(box.box_id().to_str(), true)
                })

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                mockedErgoChain.verifySubmitTransactionCalledOnce(tx)
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
            it("should set tx as invalid and set event as pending-payment when one input is spent", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                const lastCheck = ergoBlockchainHeight - ErgoConfigs.requiredConfirmation - 1
                await insertTxRecord(tx, "payment", ChainsConstants.ergo, TransactionStatus.sent, lastCheck, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, false)
                mockedErgoChain.mockSubmitTransaction(tx)

                // mock validation of tx input boxes
                for (let i = 0; i < tx.inputBoxes.length; i++) {
                    const boxBytes = tx.inputBoxes[i]
                    const box = ErgoBox.sigma_parse_bytes(boxBytes)
                    mockIsBoxUnspentAndValid(box.box_id().to_str(), i === tx.inputBoxes.length - 1)
                }

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.pendingPayment])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.invalid])
            })

            /**
             * Target: testing processSentTx (processCardanoTxInputs)
             * Dependencies:
             *    KoiosApi
             *    BlockFrostApi
             *    scannerAction
             * Expected Output:
             *    The function should send request
             */
            it("should set reward distribution tx as invalid and set event as pending-reward when one input is spent", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(mockedEvent, eventBoxAndCommitments)
                const lastCheck = ergoBlockchainHeight - ErgoConfigs.requiredConfirmation - 1
                await insertTxRecord(tx, "reward", ChainsConstants.ergo, TransactionStatus.sent, lastCheck, tx.eventId)
                mockExplorerGetTxConfirmation(tx.txId, -1)
                mockIsTxInMempool(tx.txId, false)
                mockedErgoChain.mockSubmitTransaction(tx)

                // mock validation of tx input boxes
                for (let i = 0; i < tx.inputBoxes.length; i++) {
                    const boxBytes = tx.inputBoxes[i]
                    const box = ErgoBox.sigma_parse_bytes(boxBytes)
                    mockIsBoxUnspentAndValid(box.box_id().to_str(), i === tx.inputBoxes.length - 1)
                }

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.pendingReward])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.invalid])
            })

        })

        describe("for Cardano txs", () => {
            const cardanoBlockchainHeight = TestConfigs.cardano.blockchainHeight
            const testBankAddress = CardanoTestBoxes.testBankAddress

            beforeEach("clear database tables", async () => {
                await clearTables()
                resetMockedEventProcessor()
                mockedCardanoChain.resetMockCalls()
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
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.sent, cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.pendingReward])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.completed])
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
                await insertEventRecord(mockedEvent, EventStatus.inReward)
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "reward", ChainsConstants.cardano, TransactionStatus.sent, cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 30)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.completed])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.completed])
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
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = CardanoTestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)
                await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.sent, cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, 5)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status, tx.lastCheck])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.sent, cardanoBlockchainHeight])
            })

            /**
             * Target: testing processSentTx (processCardanoTxInputs)
             * Dependencies:
             *    KoiosApi
             *    BlockFrostApi
             *    scannerAction
             * Expected Output:
             *    The function should send request
             */
            it("should resend tx when it does not found but all inputs are valid", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
                await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.sent, cardanoBlockchainHeight - 2, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, null)
                mockedCardanoChain.mockSubmitTransaction(tx)

                const cardanoTx = TransactionProcessor.cardanoChain.deserialize(tx.txBytes)
                MockedBlockFrost.mockInputProcessingMethods(cardanoTx, true)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                mockedCardanoChain.verifySubmitTransactionCalledOnce(tx)
            })

            /**
             * Target: testing processSentTx (processCardanoTxInputs)
             * Dependencies:
             *    KoiosApi
             *    BlockFrostApi
             *    scannerAction
             * Expected Output:
             *    The function should send request
             */
            it("should set payment tx as invalid and set event as pending-payment when one input is spent", async () => {
                // mock erg payment event
                const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
                await insertEventRecord(mockedEvent, EventStatus.inPayment)
                const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
                const lastCheck = cardanoBlockchainHeight - CardanoConfigs.requiredConfirmation - 1
                await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.sent, lastCheck, tx.eventId)
                mockKoiosGetTxConfirmation(tx.txId, null)
                mockedCardanoChain.mockSubmitTransaction(tx)

                const cardanoTx = TransactionProcessor.cardanoChain.deserialize(tx.txBytes)
                MockedBlockFrost.mockInputProcessingMethods(cardanoTx, false)

                // run test
                await TransactionProcessor.processTransactions()

                // verify
                const dbEvents = await allEventRecords()
                expect(dbEvents.map(event => [event.sourceTxId, event.status])[0])
                    .to.deep.equal([mockedEvent.sourceTxId, EventStatus.pendingPayment])
                const dbTxs = await allTxRecords()
                expect(dbTxs.map(tx => [tx.txId, tx.status])[0])
                    .to.deep.equal([tx.txId, TransactionStatus.invalid])
            })

        })

    })

    describe("processApprovedTx", () => {

        beforeEach("clear database tables", async () => {
            await clearTables()
            mockedCardanoChain.resetMockCalls()
            mockedErgoChain.resetMockCalls()
        })

        /**
         * Target: testing processApprovedTx
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should send request
         */
        it("should send Cardano reward distribution tx to ErgoChain for sign", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inReward)
            const eventBoxAndCommitments = ErgoTestBoxes.mockEventBoxWithSomeCommitments()
            const tx = ErgoTestBoxes.mockTokenBurningErgDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            await insertTxRecord(tx, "reward", ChainsConstants.ergo, TransactionStatus.approved, 0, tx.eventId)
            mockedErgoChain.mockRequestToSignTransaction(tx)

            // run test
            await TransactionProcessor.processTransactions()

            // verify
            mockedErgoChain.verifyRequestToSignTransactionCalledOnce(tx)
        })

        /**
         * Target: testing processApprovedTx
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should send request
         */
        it("should send Cardano tx to CardanoChain for sign", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inPayment)
            const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
            await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.approved, 0, tx.eventId)
            mockedCardanoChain.mockRequestToSignTransaction(tx)

            // run test
            await TransactionProcessor.processTransactions()

            // verify
            mockedCardanoChain.verifyRequestToSignTransactionCalledOnce(tx)
        })

    })

    describe("processSignedTx", () => {

        beforeEach("clear database tables", async () => {
            await clearTables()
            mockedErgoChain.resetMockCalls()
            mockedCardanoChain.resetMockCalls()
        })

        /**
         * Target: testing processSignedTx
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should send request
         */
        it("should submit Ergo tx to network", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = ErgoTestBoxes.mockTokenRewardEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inReward)
            const eventBoxAndCommitments = ErgoTestBoxes.mockEventBoxWithSomeCommitments()
            const tx = ErgoTestBoxes.mockTokenBurningErgDistributionTransaction(mockedEvent, eventBoxAndCommitments)
            await insertTxRecord(tx, "reward", ChainsConstants.ergo, TransactionStatus.signed, 0, tx.eventId)
            mockedErgoChain.mockSubmitTransaction(tx)

            // run test
            await TransactionProcessor.processTransactions()

            // verify
            mockedErgoChain.verifySubmitTransactionCalledOnce(tx)
        })

        /**
         * Target: testing processSignedTx
         * Dependencies:
         *    scannerAction
         * Expected Output:
         *    The function should send request
         */
        it("should submit Cardano tx to network", async () => {
            // mock erg payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inPayment)
            const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
            await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.signed, 0, tx.eventId)
            mockedCardanoChain.mockSubmitTransaction(tx)

            // run test
            await TransactionProcessor.processTransactions()

            // verify
            mockedCardanoChain.verifySubmitTransactionCalledOnce(tx)
        })

    })

})
