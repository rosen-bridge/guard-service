import {
  BigIntValueTransformer,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from '@rosen-bridge/extended-typeorm';

import { AddressEntity } from './addressEntity';

@Entity('chain_address_balance_entity')
export class ChainAddressBalanceEntity {
  /**
   * In order to create a foreign key primary column, we need to include the
   * relation column (addressId in this case) in addition to the relation itself
   */
  @PrimaryColumn('varchar')
  addressId: number;

  @ManyToOne('AddressEntity')
  @JoinColumn({ name: 'addressId', referencedColumnName: 'id' })
  address: AddressEntity;

  @PrimaryColumn('varchar')
  tokenId: string;

  @Column('varchar')
  lastUpdate: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  balance: bigint;
}
