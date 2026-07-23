import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

// After the addition of RejectedEventEntity, this table is VerifiedEventEntity
// but for avoiding redundant affection in migration, queries and dozen classes
// the renaming is omitted.
@Entity()
export class ConfirmedEventEntity {
  @PrimaryColumn('varchar')
  id: string;

  @OneToOne('EventTriggerEntity', 'id', { cascade: true })
  @JoinColumn()
  eventData: Relation<EventTriggerEntity>;

  @Column('varchar')
  status: string;

  @Column('varchar', {
    nullable: true,
  })
  firstTry: string;

  @Column('integer', {
    default: 0,
  })
  unexpectedFails: number;
}
