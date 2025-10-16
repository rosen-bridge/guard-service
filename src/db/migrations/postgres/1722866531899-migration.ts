import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1722866531899 implements MigrationInterface {
  name = 'migration1722866531899';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity"
            ADD "unexpectedFails" integer NOT NULL DEFAULT '0'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "confirmed_event_entity" DROP COLUMN "unexpectedFails"
        `);
  }
}
