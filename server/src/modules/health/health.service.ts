import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../services/redis.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  database: {
    status: 'ok' | 'error';
    responseTime: number;
    error?: string;
  };
  redis: {
    status: 'ok' | 'error';
    responseTime: number;
    error?: string;
  };
  external: {
    status: 'ok' | 'error';
    responseTime: number;
    error?: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  async check(): Promise<HealthStatus> {
    const status: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Проверяем базовое здоровье
    try {
      await this.checkDatabase();
      await this.checkRedis();
    } catch (error) {
      status.status = 'error';
      this.logger.error('Health check failed:', error);
    }

    return status;
  }

  async detailedCheck(): Promise<DetailedHealthStatus> {
    const startTime = Date.now();

    const status: DetailedHealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      database: { status: 'error', responseTime: 0 },
      redis: { status: 'error', responseTime: 0 },
      external: { status: 'error', responseTime: 0 },
    };

    // Проверяем базу данных
    const dbStart = Date.now();
    try {
      await this.checkDatabase();
      status.database.status = 'ok';
      status.database.responseTime = Date.now() - dbStart;
    } catch (error) {
      status.database.status = 'error';
      status.database.responseTime = Date.now() - dbStart;
      status.database.error =
        error instanceof Error ? error.message : String(error);
      status.status = 'error';
    }

    // Проверяем Redis
    const redisStart = Date.now();
    try {
      await this.checkRedis();
      status.redis.status = 'ok';
      status.redis.responseTime = Date.now() - redisStart;
    } catch (error) {
      status.redis.status = 'error';
      status.redis.responseTime = Date.now() - redisStart;
      status.redis.error =
        error instanceof Error ? error.message : String(error);
      status.status = 'error';
    }

    // Проверяем внешние сервисы
    const externalStart = Date.now();
    try {
      await this.checkExternalServices();
      status.external.status = 'ok';
      status.external.responseTime = Date.now() - externalStart;
    } catch (error) {
      status.external.status = 'error';
      status.external.responseTime = Date.now() - externalStart;
      status.external.error =
        error instanceof Error ? error.message : String(error);
      status.status = 'error';
    }

    const totalTime = Date.now() - startTime;
    this.logger.log(`Detailed health check completed in ${totalTime}ms`);

    return status;
  }

  private async checkDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database not initialized');
    }

    // Простой запрос для проверки подключения
    await this.dataSource.query('SELECT 1');
  }

  private async checkRedis(): Promise<void> {
    try {
      await this.redisService.ping();
    } catch (error) {
      throw new Error(
        `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async checkExternalServices(): Promise<void> {
    // Проверяем платежную систему (если нужно)
    // Можно добавить проверку других внешних API
    return Promise.resolve();
  }
}
