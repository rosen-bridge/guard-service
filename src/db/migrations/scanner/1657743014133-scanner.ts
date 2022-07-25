import { MigrationInterface, QueryRunner } from "typeorm";

export class scanner1657743014133 implements MigrationInterface {
    name = 'scanner1657743014133'

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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "event_trigger_entity"`);
    }

}
