declare module 'telegraf-ratelimit' {
  import { Context, Middleware } from 'telegraf';

  interface RateLimitOptions {
    window?: number;
    limit?: number;
    onLimitExceeded?: (ctx: Context) => void;
    keyGenerator?: (ctx: Context) => string;
  }

  function rateLimit(options: RateLimitOptions): Middleware<Context>;

  export = rateLimit;
}
