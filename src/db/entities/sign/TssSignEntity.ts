import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class TssSignEntity {
    @PrimaryColumn()
    txId: string

    @Column()
    txBytes: string

    @Column()
    signedHash: string

}
