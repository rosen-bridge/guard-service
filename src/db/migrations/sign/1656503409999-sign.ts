import { MigrationInterface, QueryRunner } from "typeorm";

export class sign1656503409999 implements MigrationInterface {
    name = 'sign1656503409999'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cardano_sign_entity" ("txId" varchar PRIMARY KEY NOT NULL, "txBytes" varchar NOT NULL, "signedHash" varchar)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "cardano_sign_entity"`);
    }

}
