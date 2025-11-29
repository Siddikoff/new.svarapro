import { Injectable } from '@nestjs/common';

@Injectable()
export class GameHistoryService {
  create(history: any): Promise<any> {
    return Promise.resolve({});
  }
}
