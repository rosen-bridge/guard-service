import mockGetAddressBoxes from "./mocked/MockedKoios";
import CardanoChain from "../../../src/chains/cardano/CardanoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { Utxo } from "../../../src/chains/cardano/models/Interfaces";
import { anything } from "ts-mockito";
import { hash_transaction } from "@emurgo/cardano-serialization-lib-nodejs";
import Utils from "../../../src/chains/ergo/helpers/Utils";
import MockedBlockFrost from "./mocked/MockedBlockFrost";
import TestUtils from "../../testUtils/TestUtils";
import { beforeEach } from "mocha";

describe("CardanoChain", () => {
    const testBankAddress = TestBoxes.testBankAddress

    describe("generateTransaction", () => {
        // mock getting bankBoxes
        const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes()
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
            // mock asset payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = await cardanoChain.generateTransaction(mockedEvent)

            // verify tx
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.true
        })

    })

    describe("verifyTransactionWithEvent", () => {

        /**
         * Target: testing verifyTransactionWithEvent
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
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx with no asset transferring", async () => {
            // mock asset payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockNoAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx that transferring multiple asset with same policyId", async () => {
            // mock asset payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockMultiAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

        /**
         * Target: testing verifyTransactionWithEvent
         * Dependencies:
         *    -
         * Expected Output:
         *    It should NOT verify the transaction
         */
        it("should reject an Asset payment tx that transferring multiple asset with different policyId", async () => {
            // mock asset payment event
            const mockedEvent: EventTrigger = TestBoxes.mockAssetPaymentEventTrigger()
            const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(mockedEvent, testBankAddress)

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const isValid = cardanoChain.verifyTransactionWithEvent(tx, mockedEvent)
            expect(isValid).to.be.false
        })

    })

    describe("signTransaction", () => {

        it("should sign a transaction successfully", async () => {
            // mock TssSigner return value
            const mockedSignTxHash = Buffer.from(
                "4d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02"
            , "hex")
            const expectedResult = "825820bcb07faa6c0f19e2f2587aa9ef6f43a68fc0135321216a71dc87c8527af4ca6a58404d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02"

            // run test
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = cardanoChain.deserialize(TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
                TestBoxes.mockAssetPaymentEventTrigger(), testBankAddress).txBytes)

            const signedTx = await cardanoChain.signTransaction(tx, mockedSignTxHash)
            expect(hash_transaction(signedTx.body()).to_bech32("00")).to.equal(hash_transaction(tx.body()).to_bech32("00"))

            const vKeyWitness = signedTx.witness_set().vkeys()?.get(0)
            expect(vKeyWitness).to.not.equal(undefined)
            const vKeyWitnessHex = Utils.Uint8ArrayToHexString(vKeyWitness!.to_bytes())
            expect(vKeyWitnessHex).to.equal(expectedResult)
        })

    })

    describe("submitTransaction", () => {

        beforeEach("reset MockedBlockFrost", function() {
            MockedBlockFrost.resetMockedBlockFrostApi()
        })

        it("should return true when submit a transaction successfully", async () => {
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = cardanoChain.deserialize(TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
                TestBoxes.mockAssetPaymentEventTrigger(), testBankAddress).txBytes)

            // mock tx submit method
            MockedBlockFrost.mockTxSubmit(anything(), TestUtils.generateRandomId())

            // run test
            const result = await cardanoChain.submitTransaction(tx)
            expect(result).to.be.true
            MockedBlockFrost.verifyTxSubmitCalledOnce(tx)
        })

        it("should return false when catch an error while submitting a transaction", async () => {
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = cardanoChain.deserialize(TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
                TestBoxes.mockAssetPaymentEventTrigger(), testBankAddress).txBytes)

            // mock tx submit method
            MockedBlockFrost.mockTxSubmitError(anything())

            // run test
            const result = await cardanoChain.submitTransaction(tx)
            expect(result).to.be.false
            MockedBlockFrost.verifyTxSubmitCalledOnce(tx)
        })

    })

})
