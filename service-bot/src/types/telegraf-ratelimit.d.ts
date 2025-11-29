declare module "telegraf-ratelimit" {
  import { Context, MiddlewareFn } from "telegraf";

  interface RateLimitOptions {
    window?: number;
    limit?: number;
    onLimitExceeded?: (ctx: Context) => void;
  }

  function rateLimit(options: RateLimitOptions): MiddlewareFn<Context>;
  export = rateLimit;
}
