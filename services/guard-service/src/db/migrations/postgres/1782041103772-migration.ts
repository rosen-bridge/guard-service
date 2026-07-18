import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1782041103772 implements MigrationInterface {
  name = 'Migration1782041103772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "chain_address_balance_entity"
    `);
    await queryRunner.query(`
      CREATE TABLE "chain_address_balance_entity" (
        "addressId" integer NOT NULL,
        "tokenId" varchar NOT NULL,
        "lastUpdate" varchar NOT NULL,
        "balance" bigint NOT NULL,
        CONSTRAINT "chain_address_balance_entity_pkey" PRIMARY KEY ("tokenId", "addressId"),
        CONSTRAINT "FK_04bab24a3aa136c05c3d489a29a" FOREIGN KEY ("addressId") REFERENCES "address_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
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
        "lastUpdate" varchar NOT NULL,
        "balance" bigint NOT NULL,
        CONSTRAINT "chain_address_balance_entity_pkey" PRIMARY KEY ("chain", "address", "tokenId")
      )
    `);
  }
}
