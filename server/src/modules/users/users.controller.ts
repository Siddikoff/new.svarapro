import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { WalletAddressDto } from './dto/wallet-address.dto';

interface AuthenticatedRequest extends Request {
  user: {
    telegramId: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('ensure')
  async ensureUser(
    @Body()
    body: {
      telegramId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    const user = await this.usersService.ensureUser(body.telegramId, {
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      balance: user.balance,
      created: true,
    };
  }

  @Get('profile/:telegramId')
  async getProfileByTelegramId(@Param('telegramId') telegramId: string) {
    return this.usersService.getProfile(telegramId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.telegramId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet-address')
  async addWalletAddress(
    @Request() req: AuthenticatedRequest,
    @Body() walletAddressDto: WalletAddressDto,
  ) {
    return this.usersService.addWalletAddress(
      req.user.telegramId,
      walletAddressDto.walletAddress,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('referrals')
  async getReferrals(@Request() req: AuthenticatedRequest) {
    return this.usersService.getReferrals(req.user.telegramId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referral-link')
  async getReferralLink(@Request() req: AuthenticatedRequest) {
    const telegramId = req.user.telegramId;
    if (!telegramId) throw new UnauthorizedException('Telegram ID is missing');
    return this.usersService.getReferralData(telegramId);
  }
}
