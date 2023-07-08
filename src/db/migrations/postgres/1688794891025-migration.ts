import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1688794891025 implements MigrationInterface {
  name = 'migration1688794891025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "confirmed_event_entity" (
                "id" character varying NOT NULL,
                "status" character varying NOT NULL,
                "firstTry" character varying,
                "eventDataId" integer,
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
                CONSTRAINT "PK_80c82fc9a1d620c3813f1c79b11" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "transaction_entity" (
                "txId" character varying NOT NULL,
                "txJson" character varying NOT NULL,
                "type" character varying NOT NULL,
                "chain" character varying NOT NULL,
                "status" character varying NOT NULL,
                "lastCheck" integer NOT NULL,
                "lastStatusUpdate" character varying,
                "failedInSign" boolean NOT NULL,
                "signFailedCount" integer NOT NULL,
                "eventId" character varying,
                CONSTRAINT "PK_61aabbea677895dac5c15dd0043" PRIMARY KEY ("txId")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "revenue_entity" (
                "id" integer NOT NULL,
                "tokenId" character varying NOT NULL,
                "amount" bigint NOT NULL,
                "txId" character varying,
                CONSTRAINT "PK_f3cebb4ca44c0f562eebb5ca4a8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity"
            ADD CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD CONSTRAINT "FK_392573e185afb94149a20cf87df" FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
            ADD CONSTRAINT "FK_d0c98b57da190d9955ca1fdcf86" FOREIGN KEY ("txId") REFERENCES "transaction_entity"("txId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE VIEW "revenue_chart" AS
            SELECT re."tokenId" AS "tokenId",
                re."amount" AS "amount",
                be."timestamp" AS "timestamp",
                be."timestamp" / 604800000 AS "weak_number",
                be."month" AS "month",
                be."year" AS "year"
            FROM "revenue_entity" "re"
                INNER JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"
                INNER JOIN "event_trigger_entity" "ete" ON "ete"."eventId" = "tx"."eventId"
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'revenue_chart',
        'SELECT re."tokenId" AS "tokenId", re."amount" AS "amount", be."timestamp" AS "timestamp", be."timestamp"/604800000 AS "weak_number", be."month" AS "month", be."year" AS "year" FROM "revenue_entity" "re" INNER JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"  INNER JOIN "event_trigger_entity" "ete" ON "ete"."eventId" = "tx"."eventId"  INNER JOIN "block_entity" "be" ON "ete"."spendBlock" = "be"."hash"',
      ]
    );
    await queryRunner.query(`
            CREATE VIEW "revenue_view" AS
            SELECT tx."txId" AS "rewardTxId",
                ete."eventId" AS "eventId",
                ete."spendHeight" AS "lockHeight",
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
                be."timestamp" AS "timestamp",
                re."tokenId" AS "revenueTokenId",
                re."amount" AS "revenueAmount"
            FROM "transaction_entity" "tx"
                LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"
                LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"
                LEFT JOIN "revenue_entity" "re" ON tx."txId" = re."txId"
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'revenue_view',
        'SELECT tx."txId" AS "rewardTxId", ete."eventId" AS "eventId", ete."spendHeight" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp", re."tokenId" AS "revenueTokenId", re."amount" AS "revenueAmount" FROM "transaction_entity" "tx" LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"  LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"  LEFT JOIN "revenue_entity" "re" ON tx."txId" = re."txId"',
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "schema" = $3
        `,
      ['VIEW', 'revenue_view', 'public']
    );
    await queryRunner.query(`
            DROP VIEW "revenue_view"
        `);
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = $1
                AND "name" = $2
                AND "schema" = $3
        `,
      ['VIEW', 'revenue_chart', 'public']
    );
    await queryRunner.query(`
            DROP VIEW "revenue_chart"
        `);
    await queryRunner.query(`
            ALTER TABLE "revenue_entity" DROP CONSTRAINT "FK_d0c98b57da190d9955ca1fdcf86"
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_392573e185afb94149a20cf87df"
        `);
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity" DROP CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd"
        `);
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "transaction_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "confirmed_event_entity"
        `);
  }
}
