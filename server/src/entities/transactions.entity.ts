import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id)
  @Index()
  user: User;

  @Column({
    type: 'enum',
    enum: ['deposit', 'withdraw'],
  })
  type: 'deposit' | 'withdraw';

  @Column({
    type: 'varchar',
    length: 16,
  })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'failed', 'complete'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  address: string | null;

  @Column({
    type: 'varchar',
    length: 128, // Изменено с 64 на 128
  })
  tracker_id: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  client_transaction_id: string | null;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  transaction_hash: string | undefined;

  @Column({
    type: 'varchar',
    length: 32,
    default: 'alfabit',
  })
  payment_provider: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  token: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  fiat_amount: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  rate: number | null;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  extra: Record<string, any> | null;
}
