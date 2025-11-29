import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface AuthenticatedRequest extends Request {
  user?: { telegramId?: string };
  body: Record<string, any>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url, body, user } = request;
    const startTime = Date.now();

    const isCritical = this.isCriticalOperation(url, method);

    if (isCritical) {
      console.log(`🚨 CRITICAL OPERATION: ${method} ${url}`, {
        user: user?.telegramId || 'anonymous',
        body: this.sanitizeBody(body),
        timestamp: new Date().toISOString(),
      });
    }

    return next.handle().pipe(
      tap({
        next: () => {
          if (isCritical) {
            const duration = Date.now() - startTime;
            console.log(`✅ CRITICAL OPERATION COMPLETED: ${method} ${url}`, {
              user: user?.telegramId || 'anonymous',
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        },
        error: (error: unknown) => {
          if (isCritical) {
            const duration = Date.now() - startTime;
            console.error(`❌ CRITICAL OPERATION FAILED: ${method} ${url}`, {
              user: user?.telegramId || 'anonymous',
              error: error instanceof Error ? error.message : String(error),
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        },
      }),
    );
  }

  private isCriticalOperation(url: string, method: string): boolean {
    if (url.includes('/finances/transaction')) return true;
    if (url.includes('/game') && method === 'POST') return true;
    if (url.includes('/admin') || url.includes('/admins')) return true;
    return false;
  }

  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    if (!body) return body;

    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.token) sanitized.token = '***';
    if (sanitized.initData) sanitized.initData = '***';

    return sanitized;
  }
}
