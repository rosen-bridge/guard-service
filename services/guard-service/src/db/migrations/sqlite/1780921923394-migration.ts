import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1780921923394 implements MigrationInterface {
  name = 'Migration1780921923394';

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

    // add DEFAULT value to unexpectedFails
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

    // add "reason" to event view
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

    // remove DEFAULT value from unexpectedFails
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
        "unexpectedFails" integer,
        CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
        CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "confirmed_event_entity"(
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
      FROM "temporary_confirmed_event_entity"
    `);
    await queryRunner.query(`
      DROP TABLE "temporary_confirmed_event_entity"
    `);

    // remove "reason" from event view
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
      VALUES (NULL, NULL, NULL, ?, ?, ?)`,
      [
        'VIEW',
        'event',
        'SELECT ete."id" AS "id", ete."eventId" AS "eventId", ete."txId" AS "txId", ete."identifier" AS "boxId", ete."block" AS "block", ete."height" AS "height", ete."fromChain" AS "fromChain", ete."toChain" AS "toChain", ete."fromAddress" AS "fromAddress", ete."toAddress" AS "toAddress", ete."amount" AS "amount", ete."bridgeFee" AS "bridgeFee", ete."networkFee" AS "networkFee", ete."sourceChainTokenId" AS "sourceChainTokenId", ete."sourceChainHeight" AS "sourceChainHeight", ete."targetChainTokenId" AS "targetChainTokenId", ete."sourceTxId" AS "sourceTxId", ete."spendTxId" AS "spendTxId", ete."result" AS "result", ete."paymentTxId" AS "paymentTxId", cee."status" AS "status" FROM "event_trigger_entity" "ete" LEFT JOIN "confirmed_event_entity" "cee" ON ete."id" = cee."eventDataId"',
      ],
    );
  }
}
