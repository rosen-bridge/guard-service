import { allTxRecords, clearTables, insertEventRecord, insertTxRecord } from "./mocked/MockedScannerModel";
import { EventStatus, EventTrigger, PaymentTransaction, TransactionStatus } from "../../src/models/Models";
import CardanoTestBoxes from "../chains/cardano/testUtils/TestBoxes";
import ChainsConstants from "../../src/chains/ChainsConstants";
import { scannerAction } from "../../src/db/models/scanner/ScannerModel";
import { expect } from "chai";

describe("ScannerDataBase", () => {

    describe("insertTx", () => {

        beforeEach("clear db tables", async () => {
            await clearTables()
        })

        it("should replace the transaction when current tx is approved and new tx has lower txId", async () => {
            // mock ADA payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inPayment)
            const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
            await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.approved, 0, tx.eventId)

            const lowerTxId = tx.txId.slice(0, tx.txId.length - 4) + "0000"
            const newTx = new PaymentTransaction(
                tx.network,
                lowerTxId,
                tx.eventId,
                tx.txBytes,
                tx.txType
            )

            // run test
            await scannerAction.insertTx(newTx)

            // verify
            const dbTxs = await allTxRecords()
            expect(dbTxs.map(tx => [tx.txId, tx.txJson])[0])
                .to.deep.equal([lowerTxId, newTx.toJson()])
        })

        it("should NOT replace the transaction when current tx is signed", async () => {
            // mock ADA payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inPayment)
            const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
            await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.signed, 0, tx.eventId)

            const lowerTxId = tx.txId.slice(0, tx.txId.length - 4) + "0000"
            const newTx = new PaymentTransaction(
                tx.network,
                lowerTxId,
                tx.eventId,
                tx.txBytes,
                tx.txType
            )

            // run test
            await scannerAction.insertTx(newTx)

            // verify
            const dbTxs = await allTxRecords()
            expect(dbTxs.map(tx => [tx.txId, tx.txJson])[0])
                .to.deep.equal([tx.txId, tx.toJson()])
        })

        it("should NOT replace the transaction when current tx has lower txId comparing to new tx", async () => {
            // mock ADA payment event
            const mockedEvent: EventTrigger = CardanoTestBoxes.mockADAPaymentEventTrigger()
            await insertEventRecord(mockedEvent, EventStatus.inPayment)
            const tx = CardanoTestBoxes.mockADAPaymentTransaction(mockedEvent)
            await insertTxRecord(tx, "payment", ChainsConstants.cardano, TransactionStatus.approved, 0, tx.eventId)

            const higherTxId = tx.txId.slice(0, tx.txId.length - 4) + "ffff"
            const newTx = new PaymentTransaction(
                tx.network,
                higherTxId,
                tx.eventId,
                tx.txBytes,
                tx.txType
            )

            // run test
            await scannerAction.insertTx(newTx)

            // verify
            const dbTxs = await allTxRecords()
            expect(dbTxs.map(tx => [tx.txId, tx.txJson])[0])
                .to.deep.equal([tx.txId, tx.toJson()])
        })

    })

})
