import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('rooms')
export class Room {
  @PrimaryColumn()
  roomId: string;

  @Column()
  minBet: number;

  @Column()
  type: 'public' | 'private';

  @OneToMany(() => User, (user) => user.currentRoom)
  players: User[];

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  finishedAt?: Date;

  @Column({ nullable: true })
  winner?: string; // telegramId победителя

  @Column({ default: false })
  isSystem: boolean; // флаг системной комнаты
}
