import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  findOneByTelegramId(id: number): Promise<any> {
    return Promise.resolve({ balance: 1000 });
  }
  findMultipleByTelegramIds(ids: number[]): Promise<any[]> {
    return Promise.resolve(ids.map(id => ({ telegramId: id, balance: 1000, username: 'user', avatarUrl: '' })));
  }
}
