import { Column, Entity, PrimaryColumn, ManyToOne, Relation } from 'typeorm';
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
  event: Relation<ConfirmedEventEntity>;

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
}
