import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776659470109 implements MigrationInterface {
  name = 'Migration1776659470109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "rejected_event_entity" (
                "eventDataId" integer PRIMARY KEY NOT NULL,
                "id" varchar NOT NULL,
                "reason" varchar NOT NULL,
                CONSTRAINT "FK_717f2f105ff80fc3e168921aae4" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "rejected_event_entity" ("eventDataId", "id", "reason")
            SELECT 
                "eventDataId",
                "id",
                'unknown (inserted on migration)'
            FROM "confirmed_event_entity"
            WHERE "status" = 'rejected'
        `);
    await queryRunner.query(`
            DELETE FROM "confirmed_event_entity"
            WHERE "status" = 'rejected'
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_reprocess_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "requestId" varchar NOT NULL,
                "eventTxId" varchar NOT NULL,
                "sender" varchar NOT NULL,
                "receiver" varchar NOT NULL,
                "status" varchar NOT NULL,
                "timestamp" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_reprocess_entity"(
                    "id",
                    "requestId",
                    "eventTxId",
                    "sender",
                    "receiver",
                    "status",
                    "timestamp"
                )
            SELECT "id",
                "requestId",
                "eventId",
                "sender",
                "receiver",
                "status",
                "timestamp"
            FROM "reprocess_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "reprocess_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_reprocess_entity"
                RENAME TO "reprocess_entity"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reprocess_entity"
                RENAME TO "temporary_reprocess_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "reprocess_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "requestId" varchar NOT NULL,
                "eventId" varchar NOT NULL,
                "sender" varchar NOT NULL,
                "receiver" varchar NOT NULL,
                "status" varchar NOT NULL,
                "timestamp" integer NOT NULL
            )
        `);
    await queryRunner.query(`
            INSERT INTO "reprocess_entity"(
                    "id",
                    "requestId",
                    "eventId",
                    "sender",
                    "receiver",
                    "status",
                    "timestamp"
                )
            SELECT "id",
                "requestId",
                "eventTxId",
                "sender",
                "receiver",
                "status",
                "timestamp"
            FROM "temporary_reprocess_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_reprocess_entity"
        `);
    await queryRunner.query(`
            INSERT INTO "confirmed_event_entity" ("id", "eventDataId", "status", "unexpectedFails")
            SELECT 
                ree."id",
                ree."eventDataId",
                'rejected',
                0
            FROM "rejected_event_entity" ree
            WHERE NOT EXISTS (
                SELECT 1
                FROM "confirmed_event_entity" cee
                WHERE cee."id" = ree."id"
            )
        `);
    await queryRunner.query(`
            DROP TABLE "rejected_event_entity"
        `);
  }
}
