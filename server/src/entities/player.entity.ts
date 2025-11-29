import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Player {
  @PrimaryColumn()
  telegramId: number;

  @Column()
  username: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;
}
