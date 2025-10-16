/* eslint-disable check-file/filename-naming-convention */
import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

// manually generated
export class migration1737547744177 implements MigrationInterface {
  name = 'migration1737547744177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // add ConfirmedEventEntity FK
    await queryRunner.query(`
            CREATE TABLE "temporary_confirmed_event_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "eventDataId" integer,
                "unexpectedFails" integer,
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
                CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_confirmed_event_entity"(
                    "id",
                    "status",
                    "firstTry",
                    "eventDataId",
                    "unexpectedFails"
                )
            SELECT "id",
                "status",
                "firstTry",
                "eventDataId",
                "unexpectedFails"
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
                "orderId" varchar,
                CONSTRAINT "FK_392573e185afb94149a20cf87df" FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_0e6ee481cd8e1a6b6bcc980b7d9" FOREIGN KEY ("orderId") REFERENCES "arbitrary_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
                    "eventId",
                    "orderId"
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
                "eventId",
                "orderId"
            FROM "transaction_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "transaction_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_transaction_entity"
                RENAME TO "transaction_entity"
        `);
    // add revenue_entity FK
    await queryRunner.query(`
            CREATE TABLE "temporary_revenue_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "txId" varchar NOT NULL,
                "revenueType" varchar NOT NULL,
                "eventDataId" integer,
                CONSTRAINT "FK_7eec37fb51bb953bcf777474875" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_revenue_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "txId",
                    "revenueType",
                    "eventDataId"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "txId",
                "revenueType",
                "eventDataId"
            FROM "revenue_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_revenue_entity"
                RENAME TO "revenue_entity"
        `);
    // add revenueChartView
    await queryRunner.query(`
            CREATE VIEW "revenue_chart" AS
            SELECT re."tokenId" AS "tokenId",
                re."amount" AS "amount",
                re."revenueType" AS "revenueType",
                be."timestamp" AS "timestamp",
                be."timestamp" / 604800 AS "week_number",
                be."month" AS "month",
                be."year" AS "year"
            FROM "revenue_entity" "re"
                INNER JOIN "event_trigger_entity" "ete" ON "ete"."id" = "re"."eventDataId"
                INNER JOIN "block_entity" "be" ON "ete"."spendBlock" = "be"."hash"
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
        'revenue_chart',
        'SELECT re."tokenId" AS "tokenId", re."amount" AS "amount", re."revenueType" AS "revenueType", be."timestamp" AS "timestamp", be."timestamp"/604800 AS "week_number", be."month" AS "month", be."year" AS "year" FROM "revenue_entity" "re" INNER JOIN "event_trigger_entity" "ete" ON "ete"."id" = "re"."eventDataId"  INNER JOIN "block_entity" "be" ON "ete"."spendBlock" = "be"."hash"',
      ],
    );
    // add revenueView
    await queryRunner.query(`
            CREATE VIEW "revenue_view" AS
            SELECT ete."id" AS "id",
                ete."spendTxId" AS "rewardTxId",
                ete."eventId" AS "eventId",
                ete."height" AS "lockHeight",
                ete."fromChain" AS "fromChain",
                ete."toChain" AS "toChain",
                ete."fromAddress" AS "fromAddress",
                ete."toAddress" AS "toAddress",
                ete."amount" AS "amount",
                ete."bridgeFee" AS "bridgeFee",
                ete."networkFee" AS "networkFee",
                ete."sourceChainTokenId" AS "lockTokenId",
                ete."sourceTxId" AS "lockTxId",
                be."height" AS "height",
                be."timestamp" AS "timestamp"
            FROM "event_trigger_entity" "ete"
                INNER JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"
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
        'revenue_view',
        'SELECT ete."id" AS "id", ete."spendTxId" AS "rewardTxId", ete."eventId" AS "eventId", ete."height" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp" FROM "event_trigger_entity" "ete" INNER JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"',
      ],
    );
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
      ],
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
      ['VIEW', 'event'],
    );
    await queryRunner.query(`
            DROP VIEW "event"
        `);
    // remove revenueView
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
        `,
      ['VIEW', 'revenue_view'],
    );
    await queryRunner.query(`
            DROP VIEW "revenue_view"
        `);
    // remove revenueChartView
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
        `,
      ['VIEW', 'revenue_chart'],
    );
    await queryRunner.query(`
            DROP VIEW "revenue_chart"
        `);
    // remove revenue_entity FK
    await queryRunner.query(`
            CREATE TABLE "temporary_revenue_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "txId" varchar NOT NULL,
                "revenueType" varchar NOT NULL,
                "eventDataId" integer
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_revenue_entity"(
                    "id",
                    "tokenId",
                    "amount",
                    "txId",
                    "revenueType",
                    "eventDataId"
                )
            SELECT "id",
                "tokenId",
                "amount",
                "txId",
                "revenueType",
                "eventDataId"
            FROM "revenue_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_revenue_entity"
                RENAME TO "revenue_entity"
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
                "requiredSign" integer NOT NULL,
                "orderId" varchar
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
                    "eventId",
                    "orderId"
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
                "eventId",
                "orderId"
            FROM "transaction_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "transaction_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_transaction_entity"
                RENAME TO "transaction_entity"
        `);
    // remove ConfirmedEventEntity FK
    await queryRunner.query(`
            CREATE TABLE "temporary_confirmed_event_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "eventDataId" integer,
                "unexpectedFails" integer,
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId")
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_confirmed_event_entity"(
                    "id",
                    "status",
                    "firstTry",
                    "eventDataId",
                    "unexpectedFails"
                )
            SELECT "id",
                "status",
                "firstTry",
                "eventDataId",
                "unexpectedFails"
            FROM "confirmed_event_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "confirmed_event_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_confirmed_event_entity"
                RENAME TO "confirmed_event_entity"
        `);
  }
}
