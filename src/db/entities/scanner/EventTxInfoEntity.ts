import { Column, Entity, OneToOne, PrimaryColumn } from "typeorm";
import { EventTriggerEntity } from "./EventTriggerEntity";

@Entity()
export class EventTxInfoEntity {
    @PrimaryColumn()
    @OneToOne(() => EventTriggerEntity)
    eventId: string

    @Column()
    txId: string

    @Column()
    paymentTxJson: string

}
