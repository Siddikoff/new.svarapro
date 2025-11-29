import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  async createPassword(telegramId: string, password: string): Promise<Admin> {
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = this.adminRepository.create({
      telegramId,
      passwordHash,
      isActive: true,
    });

    return this.adminRepository.save(admin);
  }

  async verifyPassword(telegramId: string, password: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { telegramId, isActive: true },
    });

    if (!admin) return false;

    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (isValid) {
      admin.lastLoginAt = new Date();
      await this.adminRepository.save(admin);
    }

    return isValid;
  }

  async hasPassword(telegramId: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { telegramId, isActive: true },
    });
    return !!admin;
  }

  async isAdmin(telegramId: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { telegramId, isActive: true },
    });
    return !!admin;
  }
}
