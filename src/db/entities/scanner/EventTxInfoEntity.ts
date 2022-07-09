import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { EventTriggerEntity } from "./EventTriggerEntity";
import { JoinColumn } from "typeorm/browser";

@Entity()
export class EventTxInfoEntity {
    @PrimaryColumn()
    @OneToOne(() => EventTriggerEntity)
    @JoinColumn()
    eventId: string

    @Column()
    txId: string

    @Column()
    paymentTxJson: string

}
