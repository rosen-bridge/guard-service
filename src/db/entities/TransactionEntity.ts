import { Column, Entity, PrimaryColumn, ManyToOne, Relation } from "typeorm";
import { VerifiedEventEntity } from "./VerifiedEventEntity";

@Entity()
export class TransactionEntity {
    @PrimaryColumn()
    txId: string

    @Column()
    txJson: string

    @Column()
    type: string

    @Column()
    chain: string

    @Column()
    status: string

    @Column()
    lastCheck: number

    @ManyToOne(
        "VerifiedEventEntity",
        "eventId",
        {cascade: true}
    )
    event: Relation<VerifiedEventEntity>

}
