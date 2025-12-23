import { Module } from '@nestjs/common';
import { GameService } from './services/game.service';
import { CardService } from './services/card.service';
import { PlayerService } from './services/player.service';
import { BettingService } from './services/betting.service';
import { GameStateService } from './services/game-state.service';
import { GameGateway } from './game.gateway';
import { RedisService } from '../../services/redis.service';
import { UsersModule } from '../users/users.module';

import { FinancesModule } from '../finances/finances.module';

@Module({
  imports: [UsersModule, FinancesModule],
  providers: [
    //  Основной сервис (монолитная архитектура)
    GameService,

    // Вспомогательные сервисы
    CardService,
    PlayerService,
    BettingService,
    GameStateService,

    // Инфраструктурные сервисы
    GameGateway,
    RedisService,
  ],
  exports: [GameService, GameStateService],
})
export class GameModule { }
