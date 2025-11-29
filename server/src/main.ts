import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, Request, Response } from 'express';
import helmet from 'helmet';

// Генерируем уникальный ID процесса
const processId = Math.random().toString(36).substring(2, 15);

async function bootstrap() {
  console.log(`[${processId}] Starting server process...`);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(helmet());
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ extended: true, limit: '10kb' }));

  app.enableCors({
    origin: '*', // In production, specify allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(3000);
  console.log(
    `[${processId}] Application is running on: ${await app.getUrl()}`,
  );
}

// Обработчики сигналов для корректного завершения
process.on('SIGTERM', () => {
  console.log(`[${processId}] Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${processId}] Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

bootstrap().catch((err) => {
  console.error(`[${processId}] Fatal error during startup:`, err);
  process.exit(1);
});
