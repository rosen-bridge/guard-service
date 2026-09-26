import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { ConfirmedEventEntity } from './confirmedEventEntity';
import { TransactionEntity } from './transactionEntity';
import { ZcashSigningAttemptEntity } from './zcashSigningAttemptEntity';

@Entity()
@Index('zcash_settlement_attempt_unique', ['attemptId'], { unique: true })
@Index('zcash_settlement_event_unique', ['eventId'], { unique: true })
export class ZcashSettlementEntity {
  @PrimaryColumn('varchar')
  txId: string;

  @OneToOne(() => TransactionEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'txId', referencedColumnName: 'txId' })
  transaction: Relation<TransactionEntity>;

  @Column('varchar')
  attemptId: string;

  @OneToOne(() => ZcashSigningAttemptEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'attemptId', referencedColumnName: 'attemptId' })
  attempt: Relation<ZcashSigningAttemptEntity>;

  @Column('varchar')
  eventId: string;

  @OneToOne(() => ConfirmedEventEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'eventId', referencedColumnName: 'id' })
  event: Relation<ConfirmedEventEntity>;

  @Column('text')
  receiptJson: string;
}
