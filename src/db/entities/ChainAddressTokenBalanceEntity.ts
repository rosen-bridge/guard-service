import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ChainAddressTokenBalanceEntity {
  @PrimaryColumn('varchar')
  chain: string;

  @PrimaryColumn('varchar')
  address: string;

  @PrimaryColumn('varchar')
  tokenId: string;

  @Column('integer')
  lastUpdate: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  balance: bigint;
}
