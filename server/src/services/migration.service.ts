import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface ExistsResult {
  exists: boolean;
}

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) { }

  async onModuleInit() {
    try {
      const options = this.dataSource.options as any;
      if (options.synchronize) {
        console.log('🔄 Database synchronization is enabled. Skipping migrations.');
        return;
      }

      console.log('🔄 Starting database migrations...');

      // Проверяем, есть ли таблица migrations
      const hasMigrationsTable = await this.dataSource.query<ExistsResult[]>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'migrations'
        );
      `);

      if (!hasMigrationsTable[0].exists) {
        console.log('📋 Creating migrations table...');
        await this.dataSource.query(`
          CREATE TABLE "migrations" (
            "id" SERIAL PRIMARY KEY,
            "timestamp" bigint NOT NULL,
            "name" character varying NOT NULL
          )
        `);
      }

      // Запускаем миграции
      await this.dataSource.runMigrations();

      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }
}
