import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1696428596497 implements MigrationInterface {
  name = 'migration1696428596497';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "revenue_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "txId" varchar NOT NULL,
                "revenueType" varchar NOT NULL,
                "eventDataId" integer,
                CONSTRAINT "FK_7eec37fb51bb953bcf777474875" FOREIGN KEY ("eventDataId") REFERENCES "event_trigger_entity" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "revenue_entity"
        `);
    await queryRunner.query(`
            CREATE TABLE "revenue_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "tokenId" varchar NOT NULL,
                "amount" bigint NOT NULL,
                "txId" varchar,
                CONSTRAINT "FK_d0c98b57da190d9955ca1fdcf86" FOREIGN KEY ("txId") REFERENCES "transaction_entity" ("txId") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
  }
}
