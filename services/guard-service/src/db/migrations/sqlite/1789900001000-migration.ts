import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789900001000 implements MigrationInterface {
  name = 'Migration1789900001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "transaction_entity" ADD "signingAttemptId" varchar',
    );
    await queryRunner.query(
      'ALTER TABLE "confirmed_event_entity" ADD "zcashSigningAttemptId" varchar',
    );
    await queryRunner.query(`CREATE TABLE "zcash_signing_attempt_entity" (
      "attemptId" varchar NOT NULL PRIMARY KEY,
      "txId" varchar NOT NULL,
      "activeTxId" varchar,
      "eventKey" varchar NOT NULL,
      "inputKey" varchar NOT NULL,
      "bindingJson" text NOT NULL,
      "state" varchar NOT NULL CHECK ("state" IN ('prepared', 'may_dispatch', 'signed', 'abandoned')),
      "signedJson" text,
      CHECK (("state" = 'abandoned' AND "activeTxId" IS NULL) OR ("state" IN ('prepared', 'may_dispatch', 'signed') AND "activeTxId" IS NOT NULL AND "activeTxId" = "txId")),
      FOREIGN KEY ("activeTxId") REFERENCES "transaction_entity" ("txId") ON DELETE RESTRICT ON UPDATE RESTRICT
    )`);
    await queryRunner.query(
      'CREATE INDEX "zcash_attempt_tx" ON "zcash_signing_attempt_entity" ("txId")',
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "zcash_attempt_event_reserved" ON "zcash_signing_attempt_entity" ("eventKey") WHERE "state" != 'abandoned'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "zcash_attempt_input_reserved" ON "zcash_signing_attempt_entity" ("inputKey") WHERE "state" != 'abandoned'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "zcash_signing_attempt_entity"');
    await queryRunner.dropColumn('transaction_entity', 'signingAttemptId');
    await queryRunner.dropColumn(
      'confirmed_event_entity',
      'zcashSigningAttemptId',
    );
  }
}
