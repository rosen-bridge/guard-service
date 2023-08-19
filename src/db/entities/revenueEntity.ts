import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TransactionEntity } from './TransactionEntity';
import { BigIntValueTransformer } from '../transformers';

@Entity()
export class RevenueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  tokenId: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  amount: bigint;

  @ManyToOne('TransactionEntity', 'txId', {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'txId' })
  tx: Relation<TransactionEntity>;
}
