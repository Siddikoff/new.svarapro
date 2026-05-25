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

    const validated = this.validateInitData(initData);
    if (!validated) {
      throw new UnauthorizedException('Invalid initData');
    }

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

  // Telegram initData validation per Bot API 7.0+.
  //
  // The HMAC includes every URL-decoded parameter except `hash` itself
  // (sorted by key, joined with `\n`). Older Telegram clients omit
  // `signature`; newer ones include it AND expect it to participate in
  // the hash — Telegram changed the rule when Ed25519 `signature` was
  // added alongside HMAC `hash`.
  private validateInitData(initData: string): { user: TelegramUser } | null {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    const dataToCheck = Array.from(params.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN!)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(dataToCheck)
      .digest('hex');

    if (hash !== computedHash) return null;

    return { user: JSON.parse(params.get('user')!) as TelegramUser };
  }
}
