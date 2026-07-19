import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1783289470724 implements MigrationInterface {
  name = 'Migration1783289470724';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "token_entity" (
        "id" character varying NOT NULL,
        "chain" character varying NOT NULL,
        "name" character varying NOT NULL,
        "decimals" integer NOT NULL,
        "significantDecimals" integer NOT NULL,
        "type" character varying NOT NULL,
        "residency" character varying NOT NULL,
        "extra" character varying NOT NULL,
        CONSTRAINT "PK_519d75dfb7fcdcaca7b09f3edfb" PRIMARY KEY ("id", "chain")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_47b385945a425667b9e690bc02" ON "token_entity" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_47b385945a425667b9e690bc02"
    `);
    await queryRunner.query(`
      DROP TABLE "token_entity"
    `);
  }
}
