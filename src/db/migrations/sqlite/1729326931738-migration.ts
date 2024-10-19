import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1729326931738 implements MigrationInterface {
  name = 'migration1729326931738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "arbitrary_entity" (
                "id" varchar PRIMARY KEY NOT NULL,
                "orderJson" varchar NOT NULL,
                "status" varchar NOT NULL,
                "firstTry" varchar,
                "unexpectedFails" integer NOT NULL DEFAULT (0)
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "arbitrary_entity"
        `);
  }
}
