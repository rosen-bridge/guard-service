import mockGetAddressBoxes from "./mocked/mockedKoios";
import CardanoChain from "../../../src/chains/cardano/CardanoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { Utxo } from "../../../src/chains/cardano/models/Models";

describe("CardanoChain", async () => {
    const testBankAddress: string = "addr_test1qrm4haxxgl55kqzhpp3sda8h979gxd4cast340v0eh0p4qzp3vkcrhjqavv9uzsvq86mglwnwe8xp87q3rv8ve54kasqlf7xgl"

    describe("generateTransaction", async () => {
        // mock getting bankBoxes
        const bankBoxes: Promise<Utxo[]> = TestBoxes.mockBankBoxes()
        mockGetAddressBoxes(testBankAddress, bankBoxes)

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    BlockFrostApi
         *    KoiosApi
         * Expected Output:
         *    The function should construct a valid tx successfully
         *    It should also verify it successfully
         */
        it("should generate an ADA payment tx and verify it successfully", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger()

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = await cardanoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.true
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    BlockFrostApi
         *    KoiosApi
         * Expected Output:
         *    The function should construct a valid tx successfully
         *    It should also verify it successfully
         */
        it("should generate an Asset payment tx and verify it successfully", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = await cardanoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
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
        it("should reject an ADA payment tx that transferring asset", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger()
            const tx = TestBoxes.mockAssetTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx with no asset transferring", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx that transferring multiple asset with same policyId", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing generateTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx that transferring multiple asset with different policyId", async () => {
            // mock ada payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

})
