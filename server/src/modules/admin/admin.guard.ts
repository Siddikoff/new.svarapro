import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const expectedSecret = process.env.API_SECRET;

    if (!expectedSecret) {
      throw new UnauthorizedException('API_SECRET is not configured');
    }

    if (token !== expectedSecret) {
      throw new UnauthorizedException('Invalid API secret');
    }

    return true;
  }
}
