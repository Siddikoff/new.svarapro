import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../entities/user.entity';
import { ProfileDto } from './dto/profile.dto';
import { Address } from 'ton-core';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getProfile(telegramId: string): Promise<ProfileDto> {
    const user = await this.usersRepository.findOne({
      where: { telegramId },
      select: [
        'id',
        'telegramId',
        'username',
        'avatar',
        'balance',
        'walletAddress',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance,
      walletAddress: user.walletAddress,
    };
  }

  async addWalletAddress(
    telegramId: string,
    walletAddress: string,
  ): Promise<void> {
    try {
      Address.parse(walletAddress);
    } catch {
      throw new BadRequestException('Invalid TON address format');
    }

    const existingUser = await this.usersRepository.findOne({
      where: { walletAddress },
    });
    if (existingUser) {
      throw new ConflictException('Wallet address already in use');
    }

    const user = await this.usersRepository.findOne({ where: { telegramId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.walletAddress = walletAddress;
    await this.usersRepository.save(user);
  }

  // Заглушка для обновления реферальных данных
  async updateReferralData(
    telegramId: string,
    depositAmount: number = 0,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { telegramId },
      relations: ['referrals'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (depositAmount > 0) {
      user.totalDeposit += depositAmount;
      await this.usersRepository.save(user);
    }

    const referralCount = user.referrals.length;
    if (referralCount > 0) {
      user.refBonus = this.calculateRefBonus(referralCount);
    }
    await this.usersRepository.save(user);
  }

  async getReferrals(
    telegramId: string,
  ): Promise<{ username: string | null }[]> {
    const user = await this.usersRepository.findOne({
      where: { telegramId },
      relations: ['referrals'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.referrals) {
      return [];
    }
    return user.referrals.map((referral) => ({ username: referral.username }));
  }

  // Новый метод для получения всех реферальных данных
  async getReferralData(telegramId: string) {
    const user = await this.usersRepository.findOne({
      where: { telegramId },
      relations: ['referrals'],
    });
    if (!user) throw new NotFoundException('User not found');

    const referralCount = user.referrals.length;
    const referrals = await this.getReferrals(telegramId);
    const refBonus = this.calculateRefBonus(referralCount);
    const refBalance = user.refBalance;

    return {
      referralLink: `https://t.me/Svaraprobot?start=${encodeURIComponent(telegramId)}`,
      refBalance: refBalance.toString(),
      refBonus: refBonus.toString(),
      referralCount,
      referrals,
    };
  }

  // Вспомогательный метод для расчёта бонуса
  private calculateRefBonus(referralCount: number): number {
    if (referralCount >= 101) return 10.0;
    if (referralCount >= 31) return 8.0;
    if (referralCount >= 11) return 5.0;
    if (referralCount >= 1) return 3.0;
    return 0.0;
  }

  // Обновление баланса одного игрока
  async updatePlayerBalance(
    telegramId: string,
    newBalance: number,
  ): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { telegramId },
      });
      if (!user) {
        console.error(`User not found for balance update: ${telegramId}`);
        return;
      }

      user.balance = newBalance;
      await this.usersRepository.save(user);
      // Balance update log removed
    } catch (error) {
      console.error(`Failed to update balance for user ${telegramId}:`, error);
      throw error;
    }
  }

  // Массовое обновление балансов игроков
  async updateMultiplePlayerBalances(
    players: { telegramId: string; balance: number }[],
  ): Promise<void> {
    if (players.length === 0) return;

    try {
      // Получаем всех пользователей одним запросом
      const telegramIds = players.map((p) => p.telegramId);
      const users = await this.usersRepository.find({
        where: { telegramId: In(telegramIds) },
      });

      // Создаем мапу для быстрого поиска
      const userMap = new Map(users.map((user) => [user.telegramId, user]));

      // Обновляем балансы
      for (const player of players) {
        const user = userMap.get(player.telegramId);
        if (user) {
          user.balance = player.balance;
        } else {
          console.error(
            `User not found for balance update: ${player.telegramId}`,
          );
        }
      }

      // Сохраняем все изменения одной транзакцией
      await this.usersRepository.save(users);
      console.log(`Updated balances for ${users.length} players`);
    } catch (error) {
      console.error('Failed to update multiple player balances:', error);
      throw error;
    }
  }
}
