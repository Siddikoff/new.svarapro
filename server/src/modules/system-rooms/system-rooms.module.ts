import { Module, OnModuleInit } from '@nestjs/common';
import { SystemRoomsService } from './system-rooms.service';
import { RedisService } from '../../services/redis.service';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule],
  providers: [SystemRoomsService, RedisService],
  exports: [SystemRoomsService],
})
export class SystemRoomsModule implements OnModuleInit {
  constructor(private readonly systemRoomsService: SystemRoomsService) {}

  async onModuleInit() {
    // Инициализируем системные комнаты при запуске модуля
    await this.systemRoomsService.initializeSystemRooms();
  }
}
