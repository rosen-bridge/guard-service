import { Column, Entity, OneToOne, PrimaryColumn, Relation } from "typeorm";
import { EventTriggerEntity } from "./EventTriggerEntity";

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

    @OneToOne(
        "EventTriggerEntity",
        "sourceTxId",
        {cascade: true}
    )
    event: Relation<EventTriggerEntity>

}
