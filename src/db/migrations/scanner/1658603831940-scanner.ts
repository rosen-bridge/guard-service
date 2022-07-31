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
                "eventSourceTxId" varchar,
                CONSTRAINT "FK_dd01d6b3b463d1182ed8bb2a947"
                    FOREIGN KEY ("eventSourceTxId") 
                    REFERENCES "event_trigger_entity" ("sourceTxId") 
                    ON DELETE NO ACTION 
                    ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "transaction_entity"`);
        await queryRunner.query(`DROP TABLE "event_trigger_entity"`);
    }

}
