import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FinancesModule } from './modules/finances/finances.module';
import { GameModule } from './modules/game/game.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { SystemRoomsModule } from './modules/system-rooms/system-rooms.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { BullModule } from '@nestjs/bull';
import { CustomThrottlerGuard } from './guards/throttler.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { MigrationService } from './services/migration.service';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().port().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'production')
          .default('development'),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        BOT_TOKEN: Joi.string().required(),
        API_SECRET: Joi.string().required(),
      }).unknown(true),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        return {
          type: 'postgres',
          host: config.get<string>('POSTGRES_HOST'),
          port: config.get<number>('POSTGRES_PORT'),
          username: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: false, // Отключаем для продакшена, используем миграции
          logging: process.env.NODE_ENV === 'development',
          autoCreateDatabase: false, // Отключаем для продакшена
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'callback-queue',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 минута
        limit: 100, // максимум 100 запросов в минуту
      },
    ]),
    AuthModule,
    UsersModule,
    FinancesModule,
    RoomsModule,
    SystemRoomsModule,
    GameModule,
    AdminsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: AuditInterceptor,
    },
    MigrationService,
  ],
})
export class AppModule {}
