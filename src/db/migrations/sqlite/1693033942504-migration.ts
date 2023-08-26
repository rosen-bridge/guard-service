import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1693033942504 implements MigrationInterface {
  name = 'migration1693033942504';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            VALUES (NULL, NULL, NULL, ?, ?, ?)
        `,
      [
        'VIEW',
        'revenue_view',
        'SELECT tx."txId" AS "rewardTxId", ete."eventId" AS "eventId", ete."spendHeight" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp", re."tokenId" AS "revenueTokenId", re."amount" AS "revenueAmount" FROM "revenue_entity" "re" LEFT JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"  LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"  LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash" WHERE ete."spendBlock" IS NOT NULL',
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
        'SELECT tx."txId" AS "rewardTxId", ete."eventId" AS "eventId", ete."spendHeight" AS "lockHeight", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "lockTokenId", ete."sourceTxId" AS "lockTxId", be."height" AS "height", be."timestamp" AS "timestamp", re."tokenId" AS "revenueTokenId", re."amount" AS "revenueAmount" FROM "revenue_entity" "re" LEFT JOIN "transaction_entity" "tx" ON tx."txId" = re."txId"  LEFT JOIN "event_trigger_entity" "ete" ON tx."eventId" = ete."eventId"  LEFT JOIN "block_entity" "be" ON ete."spendBlock" = be."hash"',
      ]
    );
  }
}
