import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1729326830613 implements MigrationInterface {
  name = 'migration1729326830613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "arbitrary_entity" (
                "id" character varying NOT NULL,
                "orderJson" character varying NOT NULL,
                "status" character varying NOT NULL,
                "firstTry" character varying,
                "unexpectedFails" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_b16fd13abe85298298f45738079" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "arbitrary_entity"
        `);
  }
}
