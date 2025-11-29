import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transactions.entity';
import { Room } from '../../entities/rooms.entity';
import { AdminApiGuard } from './admin.guard';

interface SumResult {
  total: string | null;
}

@Controller('admin')
@UseGuards(AdminApiGuard)
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  @Get('users')
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        refBalance: user.refBalance,
        refBonus: user.refBonus,
        totalDeposit: user.totalDeposit,
        walletAddress: user.walletAddress,
      })),
      total,
      page,
      limit,
    };
  }

  @Get('users/search')
  async searchUsers(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Query parameter is required');
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.telegramId LIKE :query', { query: `%${query}%` })
      .orWhere('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName LIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName LIKE :query', { query: `%${query}%` })
      .take(10)
      .getMany();

    return {
      users: users.map((user) => ({
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        refBalance: user.refBalance,
        refBonus: user.refBonus,
        totalDeposit: user.totalDeposit,
        walletAddress: user.walletAddress,
      })),
    };
  }

  @Get('users/:telegramId')
  async getUserById(@Param('telegramId') telegramId: string) {
    const user = await this.userRepository.findOne({ where: { telegramId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.balance,
      refBalance: user.refBalance,
      refBonus: user.refBonus,
      totalDeposit: user.totalDeposit,
      walletAddress: user.walletAddress,
    };
  }

  @Post('users/:telegramId/balance')
  async updateBalance(
    @Param('telegramId') telegramId: string,
    @Body() body: { amount: number; operation: 'add' | 'remove' },
  ) {
    const user = await this.userRepository.findOne({ where: { telegramId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (body.operation === 'remove' && user.balance < body.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    if (body.operation === 'add') {
      user.balance += body.amount;
    } else {
      user.balance -= body.amount;
    }

    await this.userRepository.save(user);

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.balance,
      refBalance: user.refBalance,
      refBonus: user.refBonus,
      totalDeposit: user.totalDeposit,
      walletAddress: user.walletAddress,
    };
  }

  @Get('stats')
  async getStats() {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Статистика по дням
    const dayStats = await this.getPeriodStats(dayStart, now);

    // Статистика по неделям
    const weekStats = await this.getPeriodStats(weekStart, now);

    // Статистика по месяцам
    const monthStats = await this.getPeriodStats(monthStart, now);

    // Общая статистика
    const totalStats = await this.getPeriodStats(new Date(0), now);

    return {
      day: { ...dayStats, period: 'day' },
      week: { ...weekStats, period: 'week' },
      month: { ...monthStats, period: 'month' },
      total: { ...totalStats, period: 'total' },
    };
  }

  private async getPeriodStats(startDate: Date, endDate: Date) {
    // Статистика транзакций
    const [deposits, withdrawals] = (await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: 'deposit' })
        .andWhere('transaction.status = :status', { status: 'complete' })
        .andWhere('transaction.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne(),

      this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: 'withdraw' })
        .andWhere('transaction.status = :status', { status: 'complete' })
        .andWhere('transaction.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne(),
    ])) as [SumResult, SumResult];

    // Количество игр
    const gamesCount = await this.roomRepository
      .createQueryBuilder('room')
      .where('room.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getCount();

    const depositsTotal = parseFloat(deposits?.total || '0') || 0;
    const withdrawalsTotal = parseFloat(withdrawals?.total || '0') || 0;
    const profit = depositsTotal - withdrawalsTotal;

    return {
      deposits: depositsTotal,
      withdrawals: withdrawalsTotal,
      profit,
      gamesCount,
    };
  }
}
