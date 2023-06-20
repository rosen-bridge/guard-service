import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1687266364401 implements MigrationInterface {
  name = 'migration1687266364401';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "confirmed_event_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "eventDataId" integer,
                CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff" UNIQUE ("eventDataId"),
                CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "transaction_entity" (
                "txId" varchar PRIMARY KEY NOT NULL,
                "txJson" varchar NOT NULL,
                "type" varchar NOT NULL,
                "chain" varchar NOT NULL,
                "status" varchar NOT NULL,
                "lastCheck" integer NOT NULL,
                "lastStatusUpdate" varchar,
                "failedInSign" boolean NOT NULL,
                "signFailedCount" integer NOT NULL,
                "eventId" varchar,
                CONSTRAINT "FK_392573e185afb94149a20cf87df" FOREIGN KEY ("eventId") REFERENCES "confirmed_event_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "transaction_entity"
        `);
    await queryRunner.query(`
            DROP TABLE "confirmed_event_entity"
        `);
  }
}
