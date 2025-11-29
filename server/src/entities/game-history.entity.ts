import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pot: number;

  @Column('simple-json')
  players: any[];

  @Column('simple-json')
  winners: any;

  @Column('simple-json')
  actions: any[];
}
