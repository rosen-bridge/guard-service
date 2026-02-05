import {
  Column,
  Entity,
  PrimaryColumn,
  ManyToOne,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { ArbitraryEntity } from './arbitraryEntity';
import { ConfirmedEventEntity } from './confirmedEventEntity';

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
