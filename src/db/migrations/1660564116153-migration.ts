// import { MigrationInterface, QueryRunner } from "typeorm";
//
// export class migration1660564116153 implements MigrationInterface {
//     name = 'migration1660564116153'
//
//     public async up(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`
//             CREATE TABLE "commitment_entity" (
//                 "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
//                 "extractor" varchar NOT NULL,
//                 "eventId" varchar NOT NULL,
//                 "commitment" varchar NOT NULL,
//                 "WID" varchar NOT NULL,
//                 "commitmentBoxId" varchar NOT NULL,
//                 "blockId" varchar NOT NULL,
//                 "height" integer NOT NULL,
//                 "boxSerialized" varchar NOT NULL,
//                 "spendBlockHash" varchar,
//                 "spendBlockHeight" integer
//             )
//         `);
//         await queryRunner.query(`
//             CREATE TABLE "block_entity" (
//                 "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
//                 "height" integer NOT NULL,
//                 "hash" varchar(64) NOT NULL,
//                 "parentHash" varchar(64) NOT NULL,
//                 "status" varchar NOT NULL,
//                 "scanner" varchar NOT NULL,
//                 CONSTRAINT "UQ_7e20625b11840edf7f120565c3d"
//                     UNIQUE ("parentHash", "scanner"),
//                 CONSTRAINT "UQ_b1e24c5950a7c3dd48d92bbfbb2"
//                     UNIQUE ("hash", "scanner"),
//                 CONSTRAINT "UQ_521d830047d5fe08988538289dd"
//                     UNIQUE ("height", "scanner")
//             )
//         `);
//         await queryRunner.query(`
//             CREATE TABLE "permit_entity" (
//                 "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
//                 "extractor" varchar NOT NULL,
//                 "boxId" varchar NOT NULL,
//                 "boxSerialized" varchar NOT NULL,
//                 "WID" varchar NOT NULL,
//                 "blockId" varchar NOT NULL,
//                 "height" integer NOT NULL,
//                 "spendBlockHash" varchar,
//                  "spendBlockHeight" integer
//              )
//          `);
//         await queryRunner.query(`
//             CREATE TABLE "event_trigger_entity" (
//                 "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
//                 "extractor" varchar NOT NULL,
//                 "boxId" varchar NOT NULL,
//                 "boxSerialized" varchar NOT NULL,
//                 "blockId" varchar NOT NULL,
//                 "height" integer NOT NULL,
//                 "fromChain" varchar NOT NULL,
//                 "toChain" varchar NOT NULL,
//                 "fromAddress" varchar NOT NULL,
//                 "toAddress" varchar NOT NULL,
//                 "amount" varchar NOT NULL,
//                 "bridgeFee" varchar NOT NULL,
//                 "networkFee" varchar NOT NULL,
//                 "sourceChainTokenId" varchar NOT NULL,
//                 "targetChainTokenId" varchar NOT NULL,
//                 "sourceTxId" varchar NOT NULL,
//                 "sourceBlockId" varchar NOT NULL,
//                 "WIDs" varchar NOT NULL
//             )
//         `);
//         await queryRunner.query(`
//             CREATE TABLE "confirmed_event_entity" (
//                 "id" varchar PRIMARY KEY NOT NULL,
//                 "status" varchar NOT NULL,
//                 "eventDataId" integer,
//                 CONSTRAINT "REL_fada7feaf4c23ad7c0c2cf58ff"
//                     UNIQUE ("eventDataId"),
//                 CONSTRAINT "FK_fada7feaf4c23ad7c0c2cf58ffd"
//                     FOREIGN KEY ("eventDataId")
//                     REFERENCES "event_trigger_entity" ("id")
//                         ON DELETE NO ACTION
//                         ON UPDATE NO ACTION
//             )
//         `);
//         await queryRunner.query(`
//             CREATE TABLE "transaction_entity" (
//                 "txId" varchar PRIMARY KEY NOT NULL,
//                 "txJson" varchar NOT NULL,
//                 "type" varchar NOT NULL,
//                 "chain" varchar NOT NULL,
//                 "status" varchar NOT NULL,
//                 "lastCheck" integer NOT NULL,
//                 "eventId" varchar,
//                 CONSTRAINT "FK_392573e185afb94149a20cf87df"
//                     FOREIGN KEY ("eventId")
//                     REFERENCES "confirmed_event_entity" ("id")
//                         ON DELETE NO ACTION
//                         ON UPDATE NO ACTION
//             )
//         `);
//     }
//
//     public async down(queryRunner: QueryRunner): Promise<void> {
//         await queryRunner.query(`DROP TABLE "event_trigger_entity"`);
//         await queryRunner.query(`DROP TABLE "transaction_entity"`);
//         await queryRunner.query(`DROP TABLE "confirmed_event_entity"`);
//         await queryRunner.query(`DROP TABLE "permit_entity"`);
//         await queryRunner.query(`DROP TABLE "block_entity"`);
//         await queryRunner.query(`DROP TABLE "commitment_entity"`);
//     }
//
// }
