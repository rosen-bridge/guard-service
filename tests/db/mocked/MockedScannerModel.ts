import { anything, spy, when } from "ts-mockito";
import { fileURLToPath } from "url";
import path from "path";
import { DataSource } from "typeorm";
import { scannerAction, ScannerDataBase } from "../../../src/db/models/scanner/ScannerModel";
import { EventTrigger, PaymentTransaction } from "../../../src/models/Models";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testScannerOrmDataSource = new DataSource({
    type: "sqlite",
    database: __dirname + "/../sqlite/test/scanner.sqlite",
    entities: ['src/db/entities/scanner/*.ts'],
    migrations: ['src/db/migrations/scanner/*.ts'],
    synchronize: false,
    logging: false
});


try {
    await testScannerOrmDataSource.initialize()
    await testScannerOrmDataSource.runMigrations()
    console.log("Test Scanner Data Source has been initialized!");
}
catch(err) {
    console.error("Error during Test Scanner Data Source initialization:", err);
}

const testScannerDataBase = new ScannerDataBase(testScannerOrmDataSource)

// mock all tssSignAction methods to call test database methods
const mockedScannerAction = spy(scannerAction)
when(mockedScannerAction.setEventTxAsApproved(anything()))
    .thenCall(testScannerDataBase.setEventTxAsApproved)
when(mockedScannerAction.setEventStatus(anything(), anything()))
    .thenCall(testScannerDataBase.setEventStatus)
when(mockedScannerAction.getEventById(anything()))
    .thenCall(testScannerDataBase.getEventById)
when(mockedScannerAction.getEventsByStatus(anything()))
    .thenCall(testScannerDataBase.getEventsByStatus)
when(mockedScannerAction.setEventTx(anything(), anything(), anything(), anything()))
    .thenCall(testScannerDataBase.setEventTx)
when(mockedScannerAction.setEventTx(anything(), anything(), anything()))
    .thenCall(testScannerDataBase.setEventTx)
when(mockedScannerAction.removeEventTx(anything()))
    .thenCall(testScannerDataBase.removeEventTx)
when(mockedScannerAction.removeAgreedTx())
    .thenCall(testScannerDataBase.removeAgreedTx)
when(mockedScannerAction.getActiveTransactions())
    .thenCall(testScannerDataBase.getActiveTransactions)
when(mockedScannerAction.setTxStatus(anything(), anything()))
    .thenCall(testScannerDataBase.setTxStatus)
when(mockedScannerAction.updateTxLastCheck(anything(), anything()))
    .thenCall(testScannerDataBase.updateTxLastCheck)
when(mockedScannerAction.resetEventTx(anything(), anything()))
    .thenCall(testScannerDataBase.resetEventTx)
when(mockedScannerAction.getTxById(anything()))
    .thenCall(testScannerDataBase.getTxById)
when(mockedScannerAction.updateWithSignedTx(anything(), anything()))
    .thenCall(testScannerDataBase.updateWithSignedTx)

/**
 * deletes every record in Event table in ScannerDatabase
 */
const clearEventTable = async () => {
    await testScannerDataBase.EventRepository.clear()
}

/**
 * deletes every record in Transaction table in ScannerDatabase
 */
const clearTxTable = async () => {
    await testScannerDataBase.TransactionRepository.clear()
}

/**
 * inserts a record to Event table in ScannerDatabase
 * @param event
 * @param status
 * @param txId
 * @param paymentTx
 */
const insertEventRecord = async (event: EventTrigger, status: string, txId?: string, paymentTx?: string) => {
    await testScannerDataBase.EventRepository.createQueryBuilder()
        .insert()
        .values({
            sourceTxId: event.sourceTxId,
            status: status,
            fromChain: event.fromChain,
            toChain: event.toChain,
            fromAddress: event.fromAddress,
            toAddress: event.toAddress,
            amount: event.amount,
            bridgeFee: event.bridgeFee,
            networkFee: event.networkFee,
            sourceChainTokenId: event.sourceChainTokenId,
            targetChainTokenId: event.targetChainTokenId,
            sourceBlockId: event.sourceBlockId,
            WIDs: event.WIDs.join(","),
            txId: txId,
            paymentTxJson: paymentTx,
        })
        .execute()
}

/**
 * inserts a record to Event table in ScannerDatabase
 * @param paymentTx
 * @param type
 * @param chain
 * @param status
 * @param lastCheck
 * @param eventId
 */
const insertTxRecord = async (paymentTx: PaymentTransaction, type: string, chain: string, status: string, lastCheck: number, eventId: string) => {
    const event = await testScannerDataBase.EventRepository.findOneBy({
        "sourceTxId": eventId
    })
    await testScannerDataBase.TransactionRepository
        .insert({
            txId: paymentTx.txId,
            txJson: paymentTx.toJson(),
            type: type,
            chain: chain,
            status: status,
            lastCheck: lastCheck,
            event: event!
        })
}

/**
 * returns all records in Event table in ScannerDatabase
 */
const allEventRecords = async () => {
    return await testScannerDataBase.EventRepository.createQueryBuilder().select().getMany()
}

/**
 * returns all records in Transaction table in ScannerDatabase
 */
const allTxRecords = async () => {
    return await testScannerDataBase.TransactionRepository.find({relations: ["event"]})
}

export {
    clearEventTable,
    clearTxTable,
    insertEventRecord,
    insertTxRecord,
    allEventRecords,
    allTxRecords
}
