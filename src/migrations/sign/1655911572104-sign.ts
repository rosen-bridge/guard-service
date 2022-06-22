import { MigrationInterface, QueryRunner } from "typeorm";

export class sign1655911572104 implements MigrationInterface {
    name = 'sign1655911572104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tss_sign_entity" ("txId" varchar PRIMARY KEY NOT NULL, "txBytes" varchar NOT NULL, "signedHash" varchar NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tss_sign_entity"`);
    }

}
