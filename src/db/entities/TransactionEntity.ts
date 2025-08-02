import { Column, Entity, PrimaryColumn, ManyToOne, Relation } from 'typeorm';
import { ArbitraryEntity } from './ArbitraryEntity';
import { ConfirmedEventEntity } from './ConfirmedEventEntity';

@Entity()
export class TransactionEntity {
  @PrimaryColumn('varchar')
  txId: string;

  @Column('varchar')
  txJson: string;

  @Column('varchar')
  type: string;

  @Column('varchar')
  chain: string;

  @Column('varchar')
  status: string;

  @Column('integer')
  lastCheck: number;

  @ManyToOne('ConfirmedEventEntity', 'eventId', {
    cascade: true,
    nullable: true,
  })
  event: Relation<ConfirmedEventEntity> | null;

  @Column('varchar', {
    nullable: true,
  })
  lastStatusUpdate: string;

  @Column('boolean')
  failedInSign: boolean;

  @Column('integer')
  signFailedCount: number;

  @Column('integer')
  requiredSign: number;

  @ManyToOne('ArbitraryEntity', 'orderId', {
    cascade: true,
    nullable: true,
  })
  order: Relation<ArbitraryEntity> | null;
}
