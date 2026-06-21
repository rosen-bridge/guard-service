import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from '@rosen-bridge/extended-typeorm';

import { AddressType } from '../../types/api';
import { SupportedChain } from '../../types/config';

@Entity('address_entity')
@Unique(['chain', 'address']) // TODO: should be checked
export class AddressEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  chain: SupportedChain;

  @Column('varchar')
  address: string;

  @Column('varchar')
  type: AddressType;
}
