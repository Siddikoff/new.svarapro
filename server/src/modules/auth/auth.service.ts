import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { TelegramUser } from '../../types/telegram';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { initData, startPayload } = loginDto;
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const params = new URLSearchParams(decodeURIComponent(initData));
    const userParam = params.get('user');

    if (!userParam)
      throw new UnauthorizedException('Missing user data in initData');

    const validated = { user: JSON.parse(userParam) as TelegramUser };

    const { user: tgUser } = validated;
    let user = await this.usersRepository.findOne({
      where: { telegramId: tgUser.id.toString() },
    });

    let referrerId: string | undefined;
    let roomId: string | undefined;

    if (startPayload) {
      const match = startPayload.match(/ref(\d+)-room(\w+)/);
      if (match) {
        referrerId = match[1];
        roomId = match[2];
      } else {
        // Fallback for old format
        referrerId = startPayload;
      }
    }

    if (!user) {
      let referrer: User | null = null;
      if (referrerId) {
        referrer = await this.usersRepository.findOne({
          where: { telegramId: referrerId },
        });
        if (!referrer) {
          // In case of an invalid referrer in the link, we just ignore it
          console.warn(`Invalid referrerId: ${referrerId}`);
        }
      }

      user = this.usersRepository.create({
        telegramId: tgUser.id.toString(),
        username: tgUser.username,
        firstName: tgUser.first_name || null,
        lastName: tgUser.last_name || null,
        avatar: tgUser.photo_url ? tgUser.photo_url : null,
        refBalance: 0,
        refBonus: 0,
        totalDeposit: 0,
        referrer: referrer, // Устанавливаем реферера
      });
      await this.usersRepository.save(user);
    } else {
      user.username = tgUser.username ?? null;
      user.firstName = tgUser.first_name || null;
      user.lastName = tgUser.last_name || null;
      user.avatar = tgUser.photo_url ? tgUser.photo_url : null;
      await this.usersRepository.save(user);
    }

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        telegramId: user.telegramId,
      }),
      roomId: roomId, // Return roomId
    };
  }

  // Метод валидации оставляем для будущего использования
  private validateInitData(initData: string): { user: TelegramUser } | null {
    const params = new URLSearchParams(decodeURIComponent(initData));
    const hash = params.get('hash');
    if (!hash) return null;

    const dataToCheck: string[] = [];
    const sortedParams = Array.from(params.entries())
      .filter(([key]) => key !== 'hash' && key !== 'signature')
      .sort(([key1], [key2]) => key1.localeCompare(key2));

    for (const [key, val] of sortedParams) {
      dataToCheck.push(`${key}=${val}`);
    }

    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN!)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(dataToCheck.join('\n'))
      .digest('hex');

    if (hash !== computedHash) {
      return null;
    }

    return { user: JSON.parse(params.get('user')!) as TelegramUser };
  }
}
