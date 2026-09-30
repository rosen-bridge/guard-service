import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

// manually generated
export class Migration1788296714000 implements MigrationInterface {
  name = 'Migration1788296714000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        ete."identifier" AS "boxId",
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
        cee."status" AS "status",
        ree."reason" AS "reason"
      FROM "event_trigger_entity" "ete"
        LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"
        LEFT JOIN "rejected_event_entity" "ree" ON ete."id" = ree."eventDataId"
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
      VALUES (NULL, NULL, NULL, ?, ?, ?)`,
      [
        'VIEW',
        'event',
        'SELECT ete."id" AS "id", ete."eventId" AS "eventId", ete."txId" AS "txId", ete."identifier" AS "boxId", ete."block" AS "block", ete."height" AS "height", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "sourceChainTokenId", ete."sourceChainHeight" AS "sourceChainHeight", ete."targetChainTokenId" AS "targetChainTokenId", ete."sourceTxId" AS "sourceTxId", ete."spendTxId" AS "spendTxId", ete."result" AS "result", ete."paymentTxId" AS "paymentTxId", cee."status" AS "status", ree."reason" AS "reason" FROM "event_trigger_entity" "ete" LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"  LEFT JOIN "rejected_event_entity" "ree" ON ete."id" = ree."eventDataId"',
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
  }
}
