import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionService {
  create(player: any, amount: number, type: string, category: string): Promise<any> {
    return Promise.resolve({});
  }
}
