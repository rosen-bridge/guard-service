import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

@Entity()
export class RejectedEventEntity {
  @PrimaryColumn('integer')
  eventDataId: number;

  @ManyToOne('EventTriggerEntity', 'id', { cascade: true })
  @JoinColumn()
  eventData: Relation<EventTriggerEntity>;

  @Column('varchar')
  id: string;

  @Column('varchar')
  reason: string;
}
