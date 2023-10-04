import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1696410507327 implements MigrationInterface {
  name = 'migration1696410507327';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "revenue_entity"
                RENAME TO "temporary_revenue_entity"
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
            DROP TABLE "temporary_revenue_entity"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_revenue_entity"
                RENAME TO "revenue_entity"
        `);
  }
}
