import mockGetAddressBoxes from "./mocked/MockedKoios";
import CardanoChain from "../../../src/chains/cardano/CardanoChain";
import { EventTrigger } from "../../../src/models/Models";
import TestBoxes from "./testUtils/TestBoxes";
import { expect } from "chai";
import { Utxo } from "../../../src/chains/cardano/models/Interfaces";
import { anything, spy, when } from "ts-mockito";
import { hash_transaction } from "@emurgo/cardano-serialization-lib-nodejs";
import Utils from "../../../src/chains/ergo/helpers/Utils";
import MockedBlockFrost from "./mocked/MockedBlockFrost";
import TestUtils from "../../testUtils/TestUtils";
import { beforeEach } from "mocha";
import { allCardanoSignRecords, clearCardanoSignTable, insertCardanoSignRecord } from "../../db/mocked/MockedSignModel";

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

    describe("requestToSignTransaction", () => {

        beforeEach("clear test sign database Cardano signs table", async () => {
            await clearCardanoSignTable()
        })

        /**
         * Target: testing signTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should insert right record into database
         */
        it("should insert request into db successfully", async () => {
            // create test data
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = cardanoChain.deserialize(TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
                TestBoxes.mockAssetPaymentEventTrigger(), testBankAddress).txBytes)
            const expectedTxId = Utils.Uint8ArrayToHexString(hash_transaction(tx.body()).to_bytes())
            const expectedTxBytes = Utils.Uint8ArrayToHexString(tx.to_bytes())
            const expectedSignedHash = null

            // run test
            await cardanoChain.requestToSignTransaction(tx)

            // verify db changes
            const signRecords = await allCardanoSignRecords()
            expect(signRecords.length).to.equal(1)
            expect(signRecords[0].txId).to.equal(expectedTxId)
            expect(signRecords[0].txBytes).to.equal(expectedTxBytes)
            expect(signRecords[0].signedHash).to.equal(expectedSignedHash)
        })

    })

    describe("signTransaction", () => {

        beforeEach("clear test sign database Cardano signs table", async () => {
            await clearCardanoSignTable()
        })

        /**
         * Target: testing signTransaction
         * Dependencies:
         *    -
         * Expected Output:
         *    It should return the signed tx with the same body and the signature as it's witness
         */
        it("should sign a transaction successfully", async () => {
            // mock TssSigner return value
            const mockedSignTxHash = "4d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02"
            const expectedResult = "825820bcb07faa6c0f19e2f2587aa9ef6f43a68fc0135321216a71dc87c8527af4ca6a58404d9794972a26d36ebc35c819ef3c8eea80bd451e497ac89a7303dd3025714cb235fcad6621778fdbd99b56753e6493ea646ac7ade8f30fed7dca7138c741fe02"

            // create test data
            const cardanoChain: CardanoChain = new CardanoChain()
            const tx = cardanoChain.deserialize(TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
                TestBoxes.mockAssetPaymentEventTrigger(), testBankAddress).txBytes)

            // insert required test data in db
            const txId = Utils.Uint8ArrayToHexString(hash_transaction(tx.body()).to_bytes())
            const serializedTx = Utils.Uint8ArrayToHexString(tx.to_bytes())
            await insertCardanoSignRecord(txId, serializedTx, "")

            // run test
            await cardanoChain.signTransaction(txId, mockedSignTxHash)

            // verify db changes
            const signRecords = await allCardanoSignRecords()
            expect(signRecords.length).to.equal(1)
            const signature = signRecords[0].signedHash
            expect(signature).to.equal(mockedSignTxHash)

            // verify signedTx txId
            const signedTx = cardanoChain.deserialize(Utils.hexStringToUint8Array(signRecords[0].txBytes))
            expect(signedTx).to.not.equal(null)
            const signedTxId = Utils.Uint8ArrayToHexString(hash_transaction(signedTx!.body()).to_bytes())
            expect(signedTxId).to.equal(txId)

            // verify signedTx signature
            const vKeyWitness = signedTx!.witness_set().vkeys()?.get(0)
            expect(vKeyWitness).to.not.equal(undefined)
            const vKeyWitnessHex = Utils.Uint8ArrayToHexString(vKeyWitness!.to_bytes())
            expect(vKeyWitnessHex).to.equal(expectedResult)
        })

    })

    describe("submitTransaction", () => {

        beforeEach("reset MockedBlockFrost", () => {
            MockedBlockFrost.resetMockedBlockFrostApi()
        })

        /**
         * Target: testing submitTransaction
         * Dependencies:
         *    BlockFrostApi
         * Expected Output:
         *    It should return true and submit tx without problem
         */
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

        /**
         * Target: testing submitTransaction
         * Dependencies:
         *    BlockFrostApi
         * Expected Output:
         *    It should try to submit and return false
         */
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
