import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1696785518070 implements MigrationInterface {
  name = 'migration1696785518070';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "revenue_entity" (
                "id" SERIAL NOT NULL,
                "tokenId" character varying NOT NULL,
                "amount" bigint NOT NULL,
                "txId" character varying NOT NULL,
                "revenueType" character varying NOT NULL,
                "eventDataId" integer,
                CONSTRAINT "PK_f3cebb4ca44c0f562eebb5ca4a8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
            ADD CONSTRAINT "FK_7eec37fb51bb953bcf777474875" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'revenue_chart',
        'SELECT re."tokenId" AS "tokenId", re."amount" AS "amount", re."revenueType" AS "revenueType", be."timestamp" AS "timestamp", be."timestamp"/604800 AS "week_number", be."month" AS "month", be."year" AS "year" FROM "revenue_entity" "re" INNER JOIN "event_trigger_entity" "ete" ON "ete"."id" = "re"."eventDataId"  INNER JOIN "block_entity" "be" ON "ete"."spendBlock" = "be"."hash"',
      ]
    );
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
            VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)
        `,
      [
        'public',
        'VIEW',
        'revenue_view',
        'SELECT ete."id" AS "id", ete."spendTxId" AS "rewardTxId", ete."eventId" AS "eventId", ete."height" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp" FROM "event_trigger_entity" "ete" INNER JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"',
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
            ALTER TABLE "revenue_entity" DROP CONSTRAINT "FK_7eec37fb51bb953bcf777474875"
        `);
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
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
            ALTER TABLE "revenue_entity"
            ADD CONSTRAINT "FK_d0c98b57da190d9955ca1fdcf86" FOREIGN KEY ("txId") REFERENCES "transaction_entity"("txId") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE SEQUENCE IF NOT EXISTS "revenue_entity_id_seq" OWNED BY "revenue_entity"."id"
        `);
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
            ALTER COLUMN "id"
            SET DEFAULT nextval('"revenue_entity_id_seq"')
        `);
    await queryRunner.query(`
            CREATE VIEW "revenue_chart" AS
            SELECT re."tokenId" AS "tokenId",
                re."amount" AS "amount",
                be."timestamp" AS "timestamp",
                be."timestamp" / 604800 AS "week_number",
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
        'SELECT re."tokenId" AS "tokenId", re."amount" AS "amount", be."timestamp" AS "timestamp", be."timestamp"/604800 AS "week_number", be."month" AS "month", be."year" AS "year" FROM "revenue_entity" "re" INNER JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"  INNER JOIN "event_trigger_entity" "ete" ON "ete"."eventId" = "tx"."eventId"  INNER JOIN "block_entity" "be" ON "ete"."spendBlock" = "be"."hash"',
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
            FROM "revenue_entity" "re"
                LEFT JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"
                LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"
                LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"
            WHERE ete."spendBlock" IS NOT NULL
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
        'SELECT tx."txId" AS "rewardTxId", ete."eventId" AS "eventId", ete."spendHeight" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp", re."tokenId" AS "revenueTokenId", re."amount" AS "revenueAmount" FROM "revenue_entity" "re" LEFT JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"  LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"  LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash" WHERE ete."spendBlock" IS NOT NULL',
      ]
    );
  }
}
