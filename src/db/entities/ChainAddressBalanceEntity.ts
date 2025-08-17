import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ChainAddressBalanceEntity {
  @PrimaryColumn('varchar')
  chain: string;

  @PrimaryColumn('varchar')
  address: string;

  @PrimaryColumn('varchar')
  tokenId: string;

  @Column('varchar')
  lastUpdate: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  balance: bigint;
}
