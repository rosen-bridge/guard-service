import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1673527456553 implements MigrationInterface {
  name = 'migration1673527456553';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "confirmed_event_entity" ADD "firstTry" varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "confirmed_event_entity" DROP COLUMN "firstTry"`
    );
  }
}
