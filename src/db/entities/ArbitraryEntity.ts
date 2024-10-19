import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ArbitraryEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  orderJson: string;

  @Column('varchar')
  status: string;

  @Column('varchar', {
    nullable: true,
  })
  firstTry: string;

  @Column('integer', {
    default: 0,
  })
  unexpectedFails: number;
}
