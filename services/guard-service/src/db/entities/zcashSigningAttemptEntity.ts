import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from '@rosen-bridge/extended-typeorm';

import { TransactionEntity } from './transactionEntity';

export type ZcashSigningAttemptState =
  | 'prepared'
  | 'may_dispatch'
  | 'signed'
  | 'abandoned';

@Entity()
@Index('zcash_attempt_event_reserved', ['eventKey'], {
  unique: true,
  where: '"state" != \'abandoned\'',
})
@Index('zcash_attempt_input_reserved', ['inputKey'], {
  unique: true,
  where: '"state" != \'abandoned\'',
})
@Check("\"state\" IN ('prepared', 'may_dispatch', 'signed', 'abandoned')")
@Check(
  `("state" = 'abandoned' AND "activeTxId" IS NULL) OR ("state" IN ('prepared', 'may_dispatch', 'signed') AND "activeTxId" IS NOT NULL AND "activeTxId" = "txId")`,
)
export class ZcashSigningAttemptEntity {
  @PrimaryColumn('varchar')
  attemptId: string;

  @Index('zcash_attempt_tx')
  @Column('varchar')
  txId: string;

  @Column('varchar', { nullable: true })
  activeTxId: string | null;

  @ManyToOne(() => TransactionEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'activeTxId', referencedColumnName: 'txId' })
  transaction: Relation<TransactionEntity> | null;

  @Column('varchar')
  eventKey: string;

  @Column('varchar')
  inputKey: string;

  @Column('text')
  bindingJson: string;

  @Column('varchar')
  state: ZcashSigningAttemptState;

  @Column('text', { nullable: true })
  signedJson: string | null;
}
