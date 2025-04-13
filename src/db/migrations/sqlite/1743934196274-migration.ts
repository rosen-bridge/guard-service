import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1743934196274 implements MigrationInterface {
  name = 'migration1743934196274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "chain_address_token_balance_entity" (
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
            DROP TABLE "chain_address_token_balance_entity"
        `);
  }
}
