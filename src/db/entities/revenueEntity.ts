import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

import { BigIntValueTransformer } from '../transformers';

@Entity()
export class RevenueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  tokenId: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount: bigint;

  @Column('varchar')
  txId: string;

  @Column('varchar')
  revenueType: string;

  @ManyToOne('EventTriggerEntity', 'id', { cascade: true })
  @JoinColumn()
  eventData: Relation<EventTriggerEntity>;
}
