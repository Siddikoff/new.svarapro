import {
  Controller,
  Get,
  Post,
  Body,
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
