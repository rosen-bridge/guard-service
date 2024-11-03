import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ReprocessEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  requestId: string;

  @Column('varchar')
  eventId: string;

  @Column('varchar')
  sender: string;

  @Column('varchar')
  receiver: string;

  @Column('varchar')
  status: string;

  @Column('integer')
  timestamp: number;
}
