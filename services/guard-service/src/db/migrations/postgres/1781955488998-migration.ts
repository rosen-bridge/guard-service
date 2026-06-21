import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1781955488998 implements MigrationInterface {
  name = 'Migration1781955488998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "address_entity" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "chain" varchar NOT NULL,
        "address" varchar NOT NULL,
        "type" varchar NOT NULL,
        CONSTRAINT "UQ_acfbbc2c7ee9ea245e3c313c312" UNIQUE ("chain", "address")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "address_entity"
    `);
  }
}
