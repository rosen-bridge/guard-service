import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1789900000000 implements MigrationInterface {
  name = 'Migration1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "transaction_entity" ADD "approvalEvidence" text',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transaction_entity', 'approvalEvidence');
  }
}
