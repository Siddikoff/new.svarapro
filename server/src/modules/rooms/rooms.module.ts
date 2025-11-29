import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsGateway } from './rooms.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../../entities/rooms.entity';
import { RedisService } from '../../services/redis.service';
import { TelegramService } from '../../services/telegram.service';
import { GameModule } from '../game/game.module';
import { UsersModule } from '../users/users.module';
import { SystemRoomsModule } from '../system-rooms/system-rooms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room]),
    GameModule,
    UsersModule,
    SystemRoomsModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway, RedisService, TelegramService],
})
export class RoomsModule {}
