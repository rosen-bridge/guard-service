import { Column, Entity, PrimaryColumn, ManyToOne, Relation } from "typeorm";
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

    @ManyToOne(
        "EventTriggerEntity",
        "sourceTxId",
        {cascade: true}
    )
    event: Relation<EventTriggerEntity>

}
