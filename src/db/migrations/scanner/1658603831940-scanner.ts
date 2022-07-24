import { MigrationInterface, QueryRunner } from "typeorm";

export class scanner1658603831940 implements MigrationInterface {
    name = 'scanner1658603831940'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "event_trigger_entity" (
                "sourceTxId" varchar PRIMARY KEY NOT NULL, 
                "status" varchar NOT NULL, 
                "fromChain" varchar NOT NULL, 
                "toChain" varchar NOT NULL, 
                "fromAddress" varchar NOT NULL, 
                "toAddress" varchar NOT NULL, 
                "amount" varchar NOT NULL, 
                "bridgeFee" varchar NOT NULL, 
                "networkFee" varchar NOT NULL, 
                "sourceChainTokenId" varchar NOT NULL, 
                "targetChainTokenId" varchar NOT NULL, 
                "sourceBlockId" varchar NOT NULL, 
                "WIDs" varchar NOT NULL, 
                "txId" varchar, 
                "paymentTxJson" varchar
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "transaction_entity" (
                "txId" varchar PRIMARY KEY NOT NULL, 
                "txJson" varchar NOT NULL, 
                "type" varchar NOT NULL, 
                "chain" varchar NOT NULL, 
                "status" varchar NOT NULL, 
                "lastCheck" integer NOT NULL, 
                "eventSourceTxId" varchar
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_transaction_entity" (
                "txId" varchar PRIMARY KEY NOT NULL, 
                "txJson" varchar NOT NULL, 
                "type" varchar NOT NULL, 
                "chain" varchar NOT NULL, 
                "status" varchar NOT NULL, 
                "lastCheck" integer NOT NULL, 
                "eventSourceTxId" varchar,
                CONSTRAINT "FK_dd01d6b3b463d1182ed8bb2a947"
                    FOREIGN KEY ("eventSourceTxId") 
                    REFERENCES "event_trigger_entity" ("sourceTxId") 
                    ON DELETE NO ACTION 
                    ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_transaction_entity"
                ("txId", "txJson", "type", "chain", "status", "lastCheck", "eventSourceTxId") 
            SELECT 
                "txId", "txJson", "type", "chain", "status", "lastCheck", "eventSourceTxId" 
            FROM "transaction_entity"
        `);
        await queryRunner.query(`DROP TABLE "transaction_entity"`);
        await queryRunner.query(`ALTER TABLE "temporary_transaction_entity" RENAME TO "transaction_entity"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_entity" RENAME TO "temporary_transaction_entity"`);
        await queryRunner.query(`
            CREATE TABLE "transaction_entity" (
                "txId" varchar PRIMARY KEY NOT NULL, 
                "txJson" varchar NOT NULL, 
                "type" varchar NOT NULL, 
                "chain" varchar NOT NULL, 
                "status" varchar NOT NULL, 
                "lastCheck" integer NOT NULL, 
                "eventSourceTxId" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "transaction_entity"
                ("txId", "txJson", "type", "chain", "status", "lastCheck", "eventSourceTxId") 
            SELECT 
                "txId", "txJson", "type", "chain", "status", "lastCheck", "eventSourceTxId" 
            FROM "temporary_transaction_entity"
        `);
        await queryRunner.query(`DROP TABLE "temporary_transaction_entity"`);
        await queryRunner.query(`DROP TABLE "transaction_entity"`);
        await queryRunner.query(`DROP TABLE "event_trigger_entity"`);
    }

}
