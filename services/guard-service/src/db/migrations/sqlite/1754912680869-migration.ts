import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1754912680869 implements MigrationInterface {
  name = 'migration1754912680869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "chain_address_balance_entity"
    `);

    await queryRunner.query(`
      CREATE TABLE "chain_address_balance_entity" (
        "chain" varchar NOT NULL,
        "address" varchar NOT NULL,
        "tokenId" varchar NOT NULL,
        "lastUpdate" varchar NOT NULL,
        "balance" bigint NOT NULL,
        PRIMARY KEY ("chain", "address", "tokenId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "chain_address_balance_entity"
    `);

    await queryRunner.query(`
      CREATE TABLE "chain_address_balance_entity" (
        "chain" varchar NOT NULL,
        "address" varchar NOT NULL,
        "tokenId" varchar NOT NULL,
        "lastUpdate" integer NOT NULL,
        "balance" bigint NOT NULL,
        PRIMARY KEY ("chain", "address", "tokenId")
      )
    `);
  }
}
