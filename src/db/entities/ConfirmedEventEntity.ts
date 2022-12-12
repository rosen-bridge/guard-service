import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

@Entity()
export class ConfirmedEventEntity {
  @PrimaryColumn()
  id: string;

  @OneToOne('EventTriggerEntity', 'id', { cascade: true })
  @JoinColumn()
  eventData: Relation<EventTriggerEntity>;

  @Column()
  status: string;

  @Column({
    nullable: true,
  })
  firstTry: string;
}
