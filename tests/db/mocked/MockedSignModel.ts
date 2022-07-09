import { anything, spy, when } from "ts-mockito";
import { SignDataBase, tssSignAction } from "../../../src/db/models/sign/SignModel";
import { fileURLToPath } from "url";
import path from "path";
import { DataSource } from "typeorm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testSignOrmDataSource = new DataSource({
    type: "sqlite",
    database: __dirname + "/../sqlite/test/sign.sqlite",
    entities: ['src/db/entities/sign/*.ts'],
    migrations: ['src/db/migrations/sign/*.ts'],
    synchronize: false,
    logging: false
});

await testSignOrmDataSource
    .initialize()
    .then(async () => {
        await testSignOrmDataSource.runMigrations()
        console.log("Test Sign Data Source has been initialized!");
    })
    .catch((err) => {
        console.error("Error during Test Sign Data Source initialization:", err);
    });

const testSignDataBase = new SignDataBase(testSignOrmDataSource)

// mock all tssSignAction methods to call test database methods
const mockedTssSignAction = spy(tssSignAction)
when(mockedTssSignAction.updateSignature(anything(), anything(), anything())).thenCall(testSignDataBase.updateSignature)
when(mockedTssSignAction.insertSignRequest(anything(), anything())).thenCall(testSignDataBase.insertSignRequest)
when(mockedTssSignAction.getById(anything())).thenCall(testSignDataBase.getById)

/**
 * deletes every record in CardanoSign table in SignDatabase
 */
const clearCardanoSignTable = async () => {
    await testSignDataBase.CardanoSignRepository.clear()
}

/**
 * inserts a record to CardanoSign table in SignDatabase
 * @param txId
 * @param txBytes
 * @param signature
 */
const insertCardanoSignRecord = async (txId: string, txBytes: string, signature: string) => {
    await testSignDataBase.CardanoSignRepository.createQueryBuilder()
        .insert()
        .values({
            txId: txId,
            txBytes: txBytes,
            signedHash: signature
        })
        .execute()
}

/**
 * returns all records in CardanoSign table in SIgnDatabase
 */
const allCardanoSignRecords = async () => {
    return await testSignDataBase.CardanoSignRepository.createQueryBuilder().select().getMany()
}

export {
    clearCardanoSignTable,
    insertCardanoSignRecord,
    allCardanoSignRecords
}
