import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getThrottlingOptions(context: ExecutionContext) {
    const route = context.switchToHttp().getRequest<Request>().url;

    // Разные лимиты для разных эндпоинтов
    if (route.includes('/auth/login')) {
      // Логин - строже
      return { ttl: 300000, limit: 5 }; // 5 попыток за 5 минут
    }

    if (route.includes('/finances/transaction')) {
      // Финансовые операции - строже
      return { ttl: 60000, limit: 10 }; // 10 операций в минуту
    }

    if (route.includes('/rooms') && route.includes('/create')) {
      // Создание комнат - умеренно
      return { ttl: 60000, limit: 20 }; // 20 комнат в минуту
    }

    if (route.includes('/game')) {
      // Игровые действия - более свободно
      return { ttl: 60000, limit: 200 }; // 200 действий в минуту
    }

    // По умолчанию
    return { ttl: 60000, limit: 100 };
  }
}
