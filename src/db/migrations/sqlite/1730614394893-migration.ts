import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1730614394893 implements MigrationInterface {
  name = 'migration1730614394893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "reprocess_entity" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "requestId" varchar NOT NULL,
                "eventId" varchar NOT NULL,
                "sender" varchar NOT NULL,
                "receiver" varchar NOT NULL,
                "status" varchar NOT NULL,
                "timestamp" integer NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "reprocess_entity"
        `);
  }
}
