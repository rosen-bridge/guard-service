import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1686869710000 implements MigrationInterface {
  name = 'migration1686869710000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_entity" ADD "failedInSign" boolean NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE "transaction_entity" ADD "signFailedCount" integer NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_entity" DROP COLUMN "signFailedCount"`
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_entity" DROP COLUMN "failedInSign"`
    );
  }
}
