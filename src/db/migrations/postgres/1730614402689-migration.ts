import { MigrationInterface, QueryRunner } from 'typeorm';

export class migration1730614402689 implements MigrationInterface {
  name = 'migration1730614402689';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "reprocess_entity" (
                "id" SERIAL NOT NULL,
                "requestId" character varying NOT NULL,
                "eventId" character varying NOT NULL,
                "sender" character varying NOT NULL,
                "receiver" character varying NOT NULL,
                "status" character varying NOT NULL,
                "timestamp" integer NOT NULL,
                CONSTRAINT "PK_045bccc0c3a8a9b33f8fb7aab82" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "reprocess_entity"
        `);
  }
}
