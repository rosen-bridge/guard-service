import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789900002000 implements MigrationInterface {
  name = 'Migration1789900002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "zcash_settlement_entity" (
      "txId" varchar NOT NULL PRIMARY KEY,
      "attemptId" varchar NOT NULL UNIQUE,
      "eventId" varchar NOT NULL UNIQUE,
      "receiptJson" text NOT NULL,
      FOREIGN KEY ("txId") REFERENCES "transaction_entity" ("txId") ON DELETE RESTRICT ON UPDATE RESTRICT,
      FOREIGN KEY ("attemptId") REFERENCES "zcash_signing_attempt_entity" ("attemptId") ON DELETE RESTRICT ON UPDATE RESTRICT,
      FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "zcash_settlement_entity"');
  }
}
