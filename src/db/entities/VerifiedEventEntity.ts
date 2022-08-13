import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, Relation } from "typeorm";
import { EventTriggerEntity } from "@rosen-bridge/watcher-data-extractor";


@Entity()
export class VerifiedEventEntity {
    @PrimaryColumn()
    sourceTxId: string

    @OneToOne("EventTriggerEntity",
        "id",
        {cascade: true}
        )
    @JoinColumn()
    event: Relation<EventTriggerEntity>

    // TODO: remove all below columns
    // @Column()
    // sourceTxId: string

    @Column()
    status: string

    @Column()
    fromChain: string

    @Column()
    toChain: string

    @Column()
    fromAddress: string

    @Column()
    toAddress: string

    @Column()
    amount: string

    @Column()
    bridgeFee: string

    @Column()
    networkFee: string

    @Column()
    sourceChainTokenId: string

    @Column()
    targetChainTokenId: string

    @Column()
    sourceBlockId: string

    @Column()
    WIDs: string


}
