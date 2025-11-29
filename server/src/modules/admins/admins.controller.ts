import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private adminsService: AdminsService) {}

  @Post('create-password')
  async createPassword(@Body() body: { telegramId: string; password: string }) {
    if (!body.telegramId || !body.password) {
      throw new BadRequestException('telegramId and password are required');
    }

    // Проверяем формат пароля (только буквы и цифры, 6-20 символов)
    const passwordRegex = /^[a-zA-Z0-9]{6,20}$/;
    if (!passwordRegex.test(body.password)) {
      throw new BadRequestException(
        'Password must contain only letters and numbers (6-20 characters)',
      );
    }

    const admin = await this.adminsService.createPassword(
      body.telegramId,
      body.password,
    );
    return { success: true, adminId: admin.id };
  }

  @Post('verify-password')
  async verifyPassword(@Body() body: { telegramId: string; password: string }) {
    if (!body.telegramId || !body.password) {
      throw new BadRequestException('telegramId and password are required');
    }

    const isValid = await this.adminsService.verifyPassword(
      body.telegramId,
      body.password,
    );
    return { isValid };
  }

  @Get('has-password/:telegramId')
  async hasPassword(@Param('telegramId') telegramId: string) {
    const hasPassword = await this.adminsService.hasPassword(telegramId);
    return { hasPassword };
  }

  @Get('check/:telegramId')
  async isAdmin(@Param('telegramId') telegramId: string) {
    const isAdmin = await this.adminsService.isAdmin(telegramId);
    return { isAdmin };
  }
}
