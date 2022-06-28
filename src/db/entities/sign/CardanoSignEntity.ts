import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class CardanoSignEntity {
    @PrimaryColumn()
    txId: string

    @Column()
    txBytes: string

    @Column()
    signedHash: string

}
