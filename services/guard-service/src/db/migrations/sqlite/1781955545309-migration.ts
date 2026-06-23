import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1781955545309 implements MigrationInterface {
  name = 'Migration1781955545309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "address_entity" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "chain" varchar NOT NULL,
        "address" varchar NOT NULL,
        "type" varchar NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "address_entity"
    `);
  }
}
