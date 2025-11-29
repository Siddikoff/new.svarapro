import { Room } from './rooms.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
  })
  @Index()
  telegramId: string;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  username: string | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  firstName: string | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  lastName: string | null;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  avatar: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 100,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  balance: number;

  @ManyToOne(() => User, (user) => user.referrals, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  referrer: User | null;

  @OneToMany(() => User, (user) => user.referrer)
  referrals: User[];

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  refBalance: number; // Общий реферальный баланс (накопления от всех рефералов)

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  refBonus: number; // Текущий процент (3%, 5%, 8%, 10%)

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalDeposit: number; // Общая сумма депозитов пользователя

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  walletAddress: string | null;

  @ManyToOne(() => Room, (room) => room.players)
  currentRoom: Room | null;
}
