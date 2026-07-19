import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783461999363 implements MigrationInterface {
  name = 'Migration1783461999363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM "typeorm_metadata"
      WHERE "type" = ?
          AND "name" = ?`,
      ['VIEW', 'event'],
    );
    await queryRunner.query(`
      DROP VIEW "event"
    `);
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
        ree."reason" AS "reason",
        te."name" AS "tokenName",
        te."significantDecimals" AS "tokenSignificantDecimals",
        te."residency" AS "tokenResidency"
      FROM "event_trigger_entity" "ete"
        LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"
        LEFT JOIN "rejected_event_entity" "ree" ON ete."id" = ree."eventDataId"
        LEFT JOIN "token_entity" "te" ON te."id" = ete."sourceChainTokenId"
        AND te."chain" = ete."fromChain"
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
        'SELECT ete."id" AS "id", ete."eventId" AS "eventId", ete."txId" AS "txId", ete."identifier" AS "boxId", ete."block" AS "block", ete."height" AS "height", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "sourceChainTokenId", ete."sourceChainHeight" AS "sourceChainHeight", ete."targetChainTokenId" AS "targetChainTokenId", ete."sourceTxId" AS "sourceTxId", ete."spendTxId" AS "spendTxId", ete."result" AS "result", ete."paymentTxId" AS "paymentTxId", cee."status" AS "status", ree."reason" AS "reason", te."name" AS "tokenName", te."significantDecimals" AS "tokenSignificantDecimals", te."residency" AS "tokenResidency" FROM "event_trigger_entity" "ete" LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"  LEFT JOIN "rejected_event_entity" "ree" ON ete."id" = ree."eventDataId"  LEFT JOIN "token_entity" "te" ON te."id" = ete."sourceChainTokenId" AND te."chain" = ete."fromChain"',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM "typeorm_metadata"
      WHERE "type" = ?
          AND "name" = ?`,
      ['VIEW', 'event'],
    );
    await queryRunner.query(`
      DROP VIEW "event"
    `);
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
}
