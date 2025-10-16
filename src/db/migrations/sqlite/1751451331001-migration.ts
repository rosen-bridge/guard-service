import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1751451331001 implements MigrationInterface {
  name = 'migration1751451331001';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "chain_address_balance_entity"
        `);
  }
}
