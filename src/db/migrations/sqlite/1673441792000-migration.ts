import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1673441792000 implements MigrationInterface {
  name = 'migration1673441792000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_entity" ADD "lastStatusUpdate" varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_entity" DROP COLUMN "lastStatusUpdate"`
    );
  }
}
