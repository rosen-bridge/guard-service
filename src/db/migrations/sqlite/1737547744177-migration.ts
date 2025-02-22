import { MigrationInterface, QueryRunner } from 'typeorm';

// manually generated
export class migration1737547744177 implements MigrationInterface {
  name = 'migration1737547744177';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      ]
    );
    // add revenueView
    await queryRunner.query(`
            CREATE VIEW "revenue_view" AS
            SELECT "pe"."id" AS "id",
                "pe"."WID" AS "wid",
                "ete"."sourceChainHeight" AS "lockHeight",
                "be"."height" AS "height",
                "be"."timestamp" AS "timestamp",
                pe."txId" AS "permitTxId",
                ete."eventId" AS "eventId",
                ete."fromChain" AS "fromChain",
                ete."toChain" AS "toChain",
                ete."fromAddress" AS "fromAddress",
                ete."toAddress" AS "toAddress",
                ete."amount" AS "amount",
                ete."bridgeFee" AS "bridgeFee",
                ete."networkFee" AS "networkFee",
                ete."sourceChainTokenId" AS "tokenId",
                ete."sourceTxId" AS "lockTxId"
            FROM "permit_entity" "pe"
                INNER JOIN "event_trigger_entity" "ete" ON pe."txId" = ete."spendTxId"
                LEFT JOIN "block_entity" "be" ON "pe"."block" = "be"."hash"
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
        'SELECT "pe"."id" AS "id", "pe"."WID" AS "wid", "ete"."sourceChainHeight" AS "lockHeight", "be"."height" AS "height", "be"."timestamp" AS "timestamp", pe."txId" AS "permitTxId", ete."eventId" AS "eventId", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "tokenId", ete."sourceTxId" AS "lockTxId" FROM "permit_entity" "pe" INNER JOIN "event_trigger_entity" "ete" ON pe."txId" = ete."spendTxId"  LEFT JOIN "block_entity" "be" ON "pe"."block" = "be"."hash"',
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove revenueView
    await queryRunner.query(
      `
            DELETE FROM "typeorm_metadata"
            WHERE "type" = ?
                AND "name" = ?
        `,
      ['VIEW', 'revenue_view']
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
      ['VIEW', 'revenue_chart']
    );
    await queryRunner.query(`
            DROP VIEW "revenue_chart"
        `);
  }
}
