import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776659742462 implements MigrationInterface {
  name = 'Migration1776659742462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "rejected_event_entity" (
                "eventDataId" integer NOT NULL,
                "id" character varying NOT NULL,
                "reason" character varying NOT NULL,
                CONSTRAINT "PK_717f2f105ff80fc3e168921aae4" PRIMARY KEY ("eventDataId")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "rejected_event_entity"
            ADD CONSTRAINT "FK_717f2f105ff80fc3e168921aae4" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
            ALTER TABLE "reprocess_entity"
                RENAME COLUMN "eventId" TO "eventTxId"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reprocess_entity"
                RENAME COLUMN "eventTxId" TO "eventId"
        `);
    await queryRunner.query(`
            INSERT INTO "confirmed_event_entity" ("id", "eventDataId", "status", "unexpectedFails")
            SELECT 
                ree."id",
                ree."eventDataId",
                'rejected',
                0
            FROM "rejected_event_entity" ree
            ON CONFLICT ("id") DO NOTHING
        `);
    await queryRunner.query(`
            ALTER TABLE "rejected_event_entity" DROP CONSTRAINT "FK_717f2f105ff80fc3e168921aae4"
        `);
    await queryRunner.query(`
            DROP TABLE "rejected_event_entity"
        `);
  }
}
