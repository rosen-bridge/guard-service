import { MigrationInterface, QueryRunner } from 'typeorm';

// manually generated
export class migration1706610773001 implements MigrationInterface {
  name = 'migration1706610773001';

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
    // remove revenue_entity FK
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
            DROP CONSTRAINT "FK_7eec37fb51bb953bcf777474875"
        `);
    // remove ConfirmedEventEntity FK
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity"
            DROP CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // add ConfirmedEventEntity FK
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity"
            ADD CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    // add revenue_entity FK
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
            ADD CONSTRAINT "FK_7eec37fb51bb953bcf777474875" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
      ]
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
      ]
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
      ]
    );
  }
}
