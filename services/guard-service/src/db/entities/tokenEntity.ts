import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from '@rosen-bridge/extended-typeorm';

import { SupportedChain } from '../../types/config';

@Entity('token_entity')
export class TokenEntity {
  @PrimaryColumn('varchar')
  id: string;

  @PrimaryColumn('varchar')
  chain: SupportedChain;

  @Column('varchar')
  @Index()
  name: string;

  @Column('integer')
  decimals: number;

  @Column('integer')
  significantDecimals: number;

  @Column('varchar')
  type: string;

  @Column('varchar')
  residency: string;

  @Column('varchar')
  extra: string;
}
