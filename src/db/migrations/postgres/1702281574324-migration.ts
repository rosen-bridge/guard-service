/* eslint-disable check-file/filename-naming-convention */
import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1702281574324 implements MigrationInterface {
  name = 'migration1702281574324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD "requiredSign" integer NOT NULL DEFAULT 6
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ALTER "requiredSign" DROP DEFAULT
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP COLUMN "requiredSign"
        `);
  }
}
