import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1722866744957 implements MigrationInterface {
  name = 'migration1722866744957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // remove EventView
    await queryRunner.query(
      `
                DELETE FROM "typeorm_metadata"
                WHERE "type" = ?
                    AND "name" = ?
            `,
      ['VIEW', 'event']
    );
    await queryRunner.query(`
                DROP VIEW "event"
            `);
    // remove TransactionEntity FK
    await queryRunner.query(`
                CREATE TABLE "temporary_transaction_entity" (
                    "txId" varchar PRIMARY KEY NOT NULL,
                    "txJson" varchar NOT NULL,
                    "type" varchar NOT NULL,
                    "chain" varchar NOT NULL,
                    "status" varchar NOT NULL,
                    "lastCheck" integer NOT NULL,
                    "lastStatusUpdate" varchar,
                    "failedInSign" boolean NOT NULL,
                    "signFailedCount" integer NOT NULL,
                    "eventId" varchar,
                    "requiredSign" integer NOT NULL
                )
            `);
    await queryRunner.query(`
                INSERT INTO "temporary_transaction_entity"(
                        "txId",
                        "txJson",
                        "type",
                        "chain",
                        "status",
                        "lastCheck",
                        "lastStatusUpdate",
                        "failedInSign",
                        "signFailedCount",
                        "requiredSign",
                        "eventId"
                    )
                SELECT "txId",
                    "txJson",
                    "type",
                    "chain",
                    "status",
                    "lastCheck",
                    "lastStatusUpdate",
                    "failedInSign",
                    "signFailedCount",
                    "requiredSign",
                    "eventId"
                FROM "transaction_entity"
            `);
    await queryRunner.query(`
                DROP TABLE "transaction_entity"
            `);
    await queryRunner.query(`
                ALTER TABLE "temporary_transaction_entity"
                    RENAME TO "transaction_entity"
            `);
    // add unexpectedFails column to confirmedEventEntity
    await queryRunner.query(`
            CREATE TABLE "temporary_confirmed_event_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "eventDataId" integer,
                "unexpectedFails" integer NOT NULL DEFAULT (0),
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
                CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_confirmed_event_entity"("id", "status", "firstTry", "eventDataId")
            SELECT "id",
                "status",
                "firstTry",
                "eventDataId"
            FROM "confirmed_event_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "confirmed_event_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_confirmed_event_entity"
                RENAME TO "confirmed_event_entity"
        `);
    // add TransactionEntity FK
    await queryRunner.query(`
                CREATE TABLE "temporary_transaction_entity" (
                    "txId" varchar PRIMARY KEY NOT NULL,
                    "txJson" varchar NOT NULL,
                    "type" varchar NOT NULL,
                    "chain" varchar NOT NULL,
                    "status" varchar NOT NULL,
                    "lastCheck" integer NOT NULL,
                    "lastStatusUpdate" varchar,
                    "failedInSign" boolean NOT NULL,
                    "signFailedCount" integer NOT NULL,
                    "eventId" varchar,
                    "requiredSign" integer NOT NULL,
                    CONSTRAINT "FK_392573e185afb94149a20cf87df" FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
                )
            `);
    await queryRunner.query(`
                INSERT INTO "temporary_transaction_entity"(
                        "txId",
                        "txJson",
                        "type",
                        "chain",
                        "status",
                        "lastCheck",
                        "lastStatusUpdate",
                        "failedInSign",
                        "signFailedCount",
                        "requiredSign",
                        "eventId"
                    )
                SELECT "txId",
                    "txJson",
                    "type",
                    "chain",
                    "status",
                    "lastCheck",
                    "lastStatusUpdate",
                    "failedInSign",
                    "signFailedCount",
                    "requiredSign",
                    "eventId"
                FROM "transaction_entity"
            `);
    await queryRunner.query(`
                DROP TABLE "transaction_entity"
            `);
    await queryRunner.query(`
                ALTER TABLE "temporary_transaction_entity"
                    RENAME TO "transaction_entity"
            `);
    // add EventView
    await queryRunner.query(`
                CREATE VIEW "event" AS
                SELECT ete."id" AS "id",
                    ete."eventId" AS "eventId",
                    ete."txId" AS "txId",
                    ete."boxId" AS "boxId",
                    ete."block" AS "block",
                    ete."height" AS "height",
                    ete."fromChain" AS "fromChain",
                    ete."toChain" AS "toChain",
                    ete."fromAddress" AS "fromAddress",
                    ete."toAddress" AS "toAddress",
                    ete."amount" AS "amount",
                    ete."bridgeFee" AS "bridgeFee",
                    ete."networkFee" AS "networkFee",
                    ete."sourceChainTokenId" AS "sourceChainTokenId",
                    ete."sourceChainHeight" AS "sourceChainHeight",
                    ete."targetChainTokenId" AS "targetChainTokenId",
                    ete."sourceTxId" AS "sourceTxId",
                    ete."spendTxId" AS "spendTxId",
                    ete."result" AS "result",
                    ete."paymentTxId" AS "paymentTxId",
                    cee."status" AS "status"
                FROM "event_trigger_entity" "ete"
                    LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"
            `);
    await queryRunner.query(
      `
                INSERT INTO "typeorm_metadata"(
                        "database",
                        "schema",
                        "table",
                        "type",
                        "name",
                        "value"
                    )
                VALUES (NULL, NULL, NULL, ?, ?, ?)
            `,
      [
        'VIEW',
        'event',
        'SELECT ete."id" AS "id", ete."eventId" AS "eventId", ete."txId" AS "txId", ete."boxId" AS "boxId", ete."block" AS "block", ete."height" AS "height", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "sourceChainTokenId", ete."sourceChainHeight" AS "sourceChainHeight", ete."targetChainTokenId" AS "targetChainTokenId", ete."sourceTxId" AS "sourceTxId", ete."spendTxId" AS "spendTxId", ete."result" AS "result", ete."paymentTxId" AS "paymentTxId", cee."status" AS "status" FROM "event_trigger_entity" "ete" LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"',
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove EventView
    await queryRunner.query(
      `
                DELETE FROM "typeorm_metadata"
                WHERE "type" = ?
                    AND "name" = ?
            `,
      ['VIEW', 'event']
    );
    await queryRunner.query(`
                DROP VIEW "event"
            `);
    // remove TransactionEntity FK
    await queryRunner.query(`
                CREATE TABLE "temporary_transaction_entity" (
                    "txId" varchar PRIMARY KEY NOT NULL,
                    "txJson" varchar NOT NULL,
                    "type" varchar NOT NULL,
                    "chain" varchar NOT NULL,
                    "status" varchar NOT NULL,
                    "lastCheck" integer NOT NULL,
                    "lastStatusUpdate" varchar,
                    "failedInSign" boolean NOT NULL,
                    "signFailedCount" integer NOT NULL,
                    "eventId" varchar,
                    "requiredSign" integer NOT NULL
                )
            `);
    await queryRunner.query(`
                INSERT INTO "temporary_transaction_entity"(
                        "txId",
                        "txJson",
                        "type",
                        "chain",
                        "status",
                        "lastCheck",
                        "lastStatusUpdate",
                        "failedInSign",
                        "signFailedCount",
                        "requiredSign",
                        "eventId"
                    )
                SELECT "txId",
                    "txJson",
                    "type",
                    "chain",
                    "status",
                    "lastCheck",
                    "lastStatusUpdate",
                    "failedInSign",
                    "signFailedCount",
                    "requiredSign",
                    "eventId"
                FROM "transaction_entity"
            `);
    await queryRunner.query(`
                DROP TABLE "transaction_entity"
            `);
    await queryRunner.query(`
                ALTER TABLE "temporary_transaction_entity"
                    RENAME TO "transaction_entity"
            `);
    // remove unexpectedFails column from confirmedEventEntity
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity"
                RENAME TO "temporary_confirmed_event_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "confirmed_event_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "eventDataId" integer,
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
                CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "confirmed_event_entity"("id", "status", "firstTry", "eventDataId")
            SELECT "id",
                "status",
                "firstTry",
                "eventDataId"
            FROM "temporary_confirmed_event_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_confirmed_event_entity"
        `);
    // add TransactionEntity FK
    await queryRunner.query(`
                CREATE TABLE "temporary_transaction_entity" (
                    "txId" varchar PRIMARY KEY NOT NULL,
                    "txJson" varchar NOT NULL,
                    "type" varchar NOT NULL,
                    "chain" varchar NOT NULL,
                    "status" varchar NOT NULL,
                    "lastCheck" integer NOT NULL,
                    "lastStatusUpdate" varchar,
                    "failedInSign" boolean NOT NULL,
                    "signFailedCount" integer NOT NULL,
                    "eventId" varchar,
                    "requiredSign" integer NOT NULL,
                    CONSTRAINT "FK_392573e185afb94149a20cf87df" FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
                )
            `);
    await queryRunner.query(`
                INSERT INTO "temporary_transaction_entity"(
                        "txId",
                        "txJson",
                        "type",
                        "chain",
                        "status",
                        "lastCheck",
                        "lastStatusUpdate",
                        "failedInSign",
                        "signFailedCount",
                        "requiredSign",
                        "eventId"
                    )
                SELECT "txId",
                    "txJson",
                    "type",
                    "chain",
                    "status",
                    "lastCheck",
                    "lastStatusUpdate",
                    "failedInSign",
                    "signFailedCount",
                    "requiredSign",
                    "eventId"
                FROM "transaction_entity"
            `);
    await queryRunner.query(`
                DROP TABLE "transaction_entity"
            `);
    await queryRunner.query(`
                ALTER TABLE "temporary_transaction_entity"
                    RENAME TO "transaction_entity"
            `);
    // add EventView
    await queryRunner.query(`
                CREATE VIEW "event" AS
                SELECT ete."id" AS "id",
                    ete."eventId" AS "eventId",
                    ete."txId" AS "txId",
                    ete."boxId" AS "boxId",
                    ete."block" AS "block",
                    ete."height" AS "height",
                    ete."fromChain" AS "fromChain",
                    ete."toChain" AS "toChain",
                    ete."fromAddress" AS "fromAddress",
                    ete."toAddress" AS "toAddress",
                    ete."amount" AS "amount",
                    ete."bridgeFee" AS "bridgeFee",
                    ete."networkFee" AS "networkFee",
                    ete."sourceChainTokenId" AS "sourceChainTokenId",
                    ete."sourceChainHeight" AS "sourceChainHeight",
                    ete."targetChainTokenId" AS "targetChainTokenId",
                    ete."sourceTxId" AS "sourceTxId",
                    ete."spendTxId" AS "spendTxId",
                    ete."result" AS "result",
                    ete."paymentTxId" AS "paymentTxId",
                    cee."status" AS "status"
                FROM "event_trigger_entity" "ete"
                    LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"
            `);
    await queryRunner.query(
      `
                INSERT INTO "typeorm_metadata"(
                        "database",
                        "schema",
                        "table",
                        "type",
                        "name",
                        "value"
                    )
                VALUES (NULL, NULL, NULL, ?, ?, ?)
            `,
      [
        'VIEW',
        'event',
        'SELECT ete."id" AS "id", ete."eventId" AS "eventId", ete."txId" AS "txId", ete."boxId" AS "boxId", ete."block" AS "block", ete."height" AS "height", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "sourceChainTokenId", ete."sourceChainHeight" AS "sourceChainHeight", ete."targetChainTokenId" AS "targetChainTokenId", ete."sourceTxId" AS "sourceTxId", ete."spendTxId" AS "spendTxId", ete."result" AS "result", ete."paymentTxId" AS "paymentTxId", cee."status" AS "status" FROM "event_trigger_entity" "ete" LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"',
      ]
    );
  }
}
