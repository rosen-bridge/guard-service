import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { TransactionEntity } from './TransactionEntity';

@Entity()
export class RevenueEntity {
  @PrimaryColumn('integer')
  id: number;

  @Column('varchar')
  tokenId: string;

  @Column({ type: 'bigint' })
  amount: string;

  @ManyToOne('TransactionEntity', 'txId', {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'txId' })
  tx: Relation<TransactionEntity>;
}
