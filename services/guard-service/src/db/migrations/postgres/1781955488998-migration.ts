import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class Migration1781955488998 implements MigrationInterface {
  name = 'Migration1781955488998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "address_entity" (
        "id" SERIAL NOT NULL,
        "chain" character varying NOT NULL,
        "address" character varying NOT NULL,
        "type" character varying NOT NULL,
        CONSTRAINT "PK_9caf3f954ed5bc66e3fa35eb7e9" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "address_entity"
    `);
  }
}
