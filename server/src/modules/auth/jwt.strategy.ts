import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET is not configured');
        }
        return process.env.JWT_SECRET;
      })(),
    });
  }

  validate(payload: { sub: string; telegramId: string }) {
    if (!payload.sub || !payload.telegramId) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      telegramId: payload.telegramId,
    };
  }
}
