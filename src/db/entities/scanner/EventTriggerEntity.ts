import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class EventTriggerEntity {
    @PrimaryColumn()
    sourceTxId: string

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
