import {
  MigrationInterface,
  QueryRunner,
} from '@rosen-bridge/extended-typeorm';

export class migration1729941610141 implements MigrationInterface {
  name = 'migration1729941610141';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "arbitrary_entity" (
                "id" character varying NOT NULL,
                "chain" character varying NOT NULL,
                "orderJson" character varying NOT NULL,
                "status" character varying NOT NULL,
                "firstTry" character varying,
                "unexpectedFails" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_b16fd13abe85298298f45738079" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD "orderId" character varying
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity"
            ADD CONSTRAINT "FK_0e6ee481cd8e1a6b6bcc980b7d9" FOREIGN KEY ("orderId") REFERENCES "arbitrary_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_0e6ee481cd8e1a6b6bcc980b7d9"
        `);
    await queryRunner.query(`
            ALTER TABLE "transaction_entity" DROP COLUMN "orderId"
        `);
    await queryRunner.query(`
            DROP TABLE "arbitrary_entity"
        `);
  }
}
