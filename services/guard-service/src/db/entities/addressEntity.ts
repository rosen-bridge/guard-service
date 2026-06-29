import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';

import { AddressType } from '../../types/api';
import { SupportedChain } from '../../types/config';

@Entity('address_entity')
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
