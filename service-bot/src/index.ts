import { Telegraf } from "telegraf";
import rateLimit from "telegraf-ratelimit";
import dotenv from "dotenv";
import { getMessage } from "./locales/index.js";
import { ServiceBotContext } from "./types/index.js";
import { AdminService } from "./services/admin.service.js";
import { UsersService } from "./services/users.service.js";
import { StatsService } from "./services/stats.service.js";
import { AdminHandlers } from "./handlers/admin.handlers.js";
import { UserHandlers } from "./handlers/user.handlers.js";

// Загружаем переменные окружения
dotenv.config();

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

const bot = new Telegraf<ServiceBotContext>(BOT_TOKEN);

// Создаем сервисы
const adminService = new AdminService();
const usersService = new UsersService();
const statsService = new StatsService();
const adminHandlers = new AdminHandlers(
  adminService,
  usersService,
  statsService,
);
const userHandlers = new UserHandlers();

// Rate-limiting
bot.use(
  rateLimit({
    window: 500,
    limit: 1,
    onLimitExceeded: (ctx: ServiceBotContext) =>
      ctx.reply(getMessage("ru", "errors.tooManyRequests")),
  }),
);

// Middleware для определения языка и проверки админа
bot.use(async (ctx, next) => {
  const user = ctx.from;
  if (user) {
    // Всегда используем русский язык
    ctx.locale = "ru";

    // Проверяем авторизацию админа
    const telegramId = user.id.toString();
    ctx.isAdmin = adminHandlers.isAdminAuthenticated(telegramId);
  }
  await next();
});

// Базовые команды
bot.start(async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  // Создаём пользователя если его нет и получаем баланс
  const apiService = new (await import("./services/api.service.js")).ApiService();
  let balance = 0;

  try {
    console.log(`[START] Creating/ensuring user for telegramId: ${user.id}`);
    await apiService.ensureUser(user.id.toString(), {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    console.log(`[START] User ensured successfully for telegramId: ${user.id}`);

    // Get user balance
    const profile = await apiService.getUserProfile(user.id.toString());
    balance = profile.balance;
    console.log(`[START] User balance fetched: ${balance} for telegramId: ${user.id}`);
  } catch (error) {
    console.error(`[START] Failed to ensure user or get balance for telegramId ${user.id}:`, error);
  }

  const welcomeMessage = `👋 Привет!

💰 *Ваш баланс: ${balance.toFixed(2)} USDT*

Здесь вы можете:
▪️ Пополнить баланс
▪️ Вывести средства
▪️ Посмотреть историю операций

Выберите действие:`;

  const { Markup } = await import("telegraf");

  await ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("💰 Пополнить баланс", "start_deposit")],
      [Markup.button.callback("💸 Вывести средства", "start_withdraw")],
      [Markup.button.callback("📜 История фиатных переводов", "start_fiat_history")],
    ]),
  });
});

bot.help(async (ctx) => {
  const helpText =
    getMessage("ru", "help.title") + getMessage("ru", "help.common").join("\n");

  await ctx.reply(helpText);
});

// Админ команды
bot.command("admin_menu", (ctx) => adminHandlers.handleAdminMenuCommand(ctx));

// Пользовательские команды
bot.command("deposit", (ctx) => userHandlers.handleDepositCommand(ctx));
bot.command("withdraw", (ctx) => userHandlers.handleWithdrawCommand(ctx));
bot.command("balance", (ctx) => userHandlers.handleBalanceCommand(ctx));
// bot.command("cancel", (ctx) => userHandlers.handleCancelCommand(ctx));

// Обработка callback'ов
// Кнопки главного меню
bot.action("start_deposit", async (ctx) => {
  await ctx.answerCbQuery();
  await userHandlers.handleDepositCommand(ctx);
});
bot.action("start_withdraw", async (ctx) => {
  await ctx.answerCbQuery();
  await userHandlers.handleWithdrawCommand(ctx);
});
bot.action("start_fiat_history", async (ctx) => {
  await ctx.answerCbQuery();
  await userHandlers.handleFiatHistoryCommand(ctx);
});

// Пользовательские callback'ы - Пополнение
bot.action(/deposit_currency_.+/, (ctx) => userHandlers.handleCurrencySelection(ctx));
bot.action(/deposit_rub_amount_.+/, (ctx) => userHandlers.handleRubAmountSelection(ctx));
bot.action("deposit_rub_custom_amount", (ctx) => userHandlers.handleRubCustomAmount(ctx));
bot.action(/deposit_bank_.+/, (ctx) => userHandlers.handleBankSelection(ctx));
bot.action(/deposit_amount_.+/, (ctx) => userHandlers.handleAmountSelection(ctx));
bot.action("deposit_custom_amount", (ctx) => userHandlers.handleCustomAmount(ctx));
bot.action(/deposit_back_.+/, (ctx) => userHandlers.handleBackButton(ctx));
bot.action(/deposit_done_.+/, (ctx) => userHandlers.handleDoneButton(ctx));
bot.action("cancel_operation", (ctx) => userHandlers.handleCancelCommand(ctx));

// Пользовательские callback'ы - Вывод
bot.action(/withdraw_currency_.+/, (ctx) => userHandlers.handleWithdrawCurrencySelection(ctx));

bot.action(/withdraw_back_.+/, (ctx) => userHandlers.handleWithdrawBackButton(ctx));

// Админские callback'ы
bot.action(/admin_(.+)/, async (ctx) => {
  const callbackData = ctx.match?.[1];

  if (!callbackData) {
    await ctx.answerCbQuery();
    return;
  }

  if (callbackData === "menu") {
    await adminHandlers.showAdminMenu(ctx);
  } else if (callbackData === "stats") {
    await adminHandlers.showStats(ctx);
  } else if (callbackData === "stats_all") {
    await adminHandlers.showStats(ctx, "all");
  } else if (callbackData === "stats_crypto") {
    await adminHandlers.showStats(ctx, "crypto");
  } else if (callbackData === "stats_fiat") {
    await adminHandlers.showStats(ctx, "fiat");
  } else if (callbackData.startsWith("users_")) {
    const parts = callbackData.split("_");
    const pageStr = parts[1];
    if (pageStr) {
      const page = parseInt(pageStr);
      if (!isNaN(page)) {
        await adminHandlers.showUsers(ctx, page);
      }
    }
  } else if (callbackData.startsWith("user_")) {
    const parts = callbackData.split("_");
    const telegramId = parts[1];
    if (telegramId) {
      await adminHandlers.showUserInfo(ctx, telegramId);
    }
  } else if (callbackData === "search") {
    await adminHandlers.showSearchPrompt(ctx);
  } else if (callbackData.startsWith("add_balance_")) {
    const parts = callbackData.split("_");
    const telegramId = parts[2];
    if (telegramId) {
      await adminHandlers.handleAddBalance(ctx, telegramId);
    }
  } else if (callbackData.startsWith("remove_balance_")) {
    const parts = callbackData.split("_");
    const telegramId = parts[2];
    if (telegramId) {
      await adminHandlers.handleRemoveBalance(ctx, telegramId);
    }
  }

  await ctx.answerCbQuery();
});

// Обработка текстовых сообщений для паролей и пользовательского ввода
bot.hears(/.*/, async (ctx) => {
  // Сначала проверяем пользовательский ввод (например, кастомную сумму)
  await userHandlers.handleTextMessage(ctx);

  // Затем проверяем админский ввод (пароль)
  await adminHandlers.handlePasswordInput(ctx);
});

// Graceful shutdown
const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Shutting down service bot (${signal})`);
  bot.stop(signal);
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

// Запуск
bot
  .launch()
  .then(() => console.log("Service bot started on @" + bot.botInfo?.username))
  .catch((err) => {
    console.error("Service bot start failed:", err);
    process.exit(1);
  });
