import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1702226892058 implements MigrationInterface {
  name = 'migration1702226892058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD "requiredSign" integer NOT NULL DEFAULT '6'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP COLUMN "requiredSign"
        `);
  }
}
