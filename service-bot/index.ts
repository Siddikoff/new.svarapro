import { Telegraf, Context } from "telegraf";
import rateLimit from "telegraf-ratelimit";
import dotenv from "dotenv";
import { getMessage } from "./src/locales/index.js";
import { AdminHandlers } from "./src/handlers/admin.handlers.js";
import { AdminService } from "./src/services/admin.service.js";

dotenv.config();

interface ServiceBotContext extends Context {
  isAdmin?: boolean;
  locale?: Locale;
}

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set");
}

const adminService = new AdminService();
const adminHandlers = new AdminHandlers(adminService);

const bot = new Telegraf<ServiceBotContext>(BOT_TOKEN);

bot.use(
  rateLimit({
    window: 3000,
    limit: 1,
    onLimitExceeded: (ctx) =>
      ctx.reply("Too many requests, please try again later."),
  }),
);

bot.command("admin_login", (ctx) => adminHandlers.handleAdminLogin(ctx));
bot.hears(/.*/, (ctx) => adminHandlers.handlePasswordInput(ctx));

bot.use(async (ctx, next) => {
  const user = ctx.from;
  if (user) {
    ctx.locale = (user.language_code as Locale) || "ru";
    const telegramId = user.id.toString();
    ctx.isAdmin = adminHandlers.isAdminAuthenticated(telegramId);
  }
  await next();
});

bot.start(async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  const locale = ctx.locale || "ru";
  const welcomeMessage = getMessage(
    locale,
    "welcome",
    user.first_name,
    ctx.isAdmin,
  );
  await ctx.reply(welcomeMessage);
});

bot.help(async (ctx) => {
  const locale = ctx.locale || "ru";
  const isAdmin = ctx.isAdmin;
  const helpText =
    getMessage(locale, "help.title") +
    getMessage(locale, "help.common").join("\n") +
    "\n\n";
  if (isAdmin) {
    const adminCommands = getMessage(locale, "help.admin").join("\n");
    await ctx.reply(helpText + adminCommands);
  } else {
    await ctx.reply(helpText);
  }
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Shutting down service bot (${signal})`);
  bot.stop();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

bot
  .launch()
  .then(() => console.log("Sevice bot started on @" + bot.botInfo?.username))
  .catch((err) => {
    console.error("Service bot start failed:", err);
    process.exit(1);
  });
