import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783289525501 implements MigrationInterface {
  name = 'Migration1783289525501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "token_entity" (
        "id" varchar NOT NULL,
        "chain" varchar NOT NULL,
        "name" varchar NOT NULL,
        "decimals" integer NOT NULL,
        "significantDecimals" integer NOT NULL,
        "type" varchar NOT NULL,
        "residency" varchar NOT NULL,
        "extra" varchar NOT NULL,
        PRIMARY KEY ("id", "chain")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_47b385945a425667b9e690bc02" ON "token_entity" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_47b385945a425667b9e690bc02"
    `);
    await queryRunner.query(`
      DROP TABLE "token_entity"
    `);
  }
}
