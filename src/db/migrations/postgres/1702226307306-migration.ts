import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1702226307306 implements MigrationInterface {
  name = 'migration1702226307306';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD "requiredSign" integer NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP COLUMN "requiredSign"
        `);
  }
}
