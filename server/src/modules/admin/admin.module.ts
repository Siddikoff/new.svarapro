import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminApiGuard } from './admin.guard';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transactions.entity';
import { Room } from '../../entities/rooms.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Room])],
  controllers: [AdminController],
  providers: [AdminApiGuard],
})
export class AdminModule {}
