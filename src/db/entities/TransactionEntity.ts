import { Column, Entity, PrimaryColumn, ManyToOne, Relation } from 'typeorm';
import { ConfirmedEventEntity } from './ConfirmedEventEntity';

@Entity()
export class TransactionEntity {
  @PrimaryColumn()
  txId: string;

  @Column()
  txJson: string;

  @Column()
  type: string;

  @Column()
  chain: string;

  @Column()
  status: string;

  @Column()
  lastCheck: number;

  @ManyToOne('ConfirmedEventEntity', 'eventId', {
    cascade: true,
    nullable: true,
  })
  event: Relation<ConfirmedEventEntity>;

  @Column({
    nullable: true,
  })
  lastStatusUpdate: string;
}
