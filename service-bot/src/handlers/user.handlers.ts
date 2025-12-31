import { Context, Markup } from "telegraf";
import { ApiService } from "../services/api.service.js";
import { ServiceBotContext } from "../types/index.js";

// Session storage for user deposit state
interface DepositSession {
  currency?: string;
  bankId?: number;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  awaitingCustomAmount?: boolean;
}

interface WithdrawSession {
  currency?: string;
  token?: string;
  amount?: number;
  receiver?: string;
  bankName?: string;
  recipientName?: string;
  waitingFor?: "receiver" | "bankName" | "recipientName";
}

const depositSessions: Map<string, DepositSession> = new Map();
const withdrawSessions: Map<string, WithdrawSession> = new Map();

async function getMainMenuMessage(apiService: ApiService, userId: string, prefix: string = ""): Promise<string> {
  try {
    const profile = await apiService.getUserProfile(userId);
    return (
      `${prefix ? prefix + "\n\n" : ""}💰 *Ваш баланс: ${profile.balance.toFixed(2)} USDT*\n\n` +
      `Выберите действие:`
    );
  } catch (error) {
    // Fallback if balance fetch fails
    return `${prefix ? prefix + "\n\n" : ""}Выберите действие:`;
  }
}

function roundToNiceNumber(n: number): number {
  if (n < 100) return Math.round(n / 10) * 10;
  if (n < 1000) return Math.round(n / 100) * 100;
  if (n < 10000) return Math.round(n / 1000) * 1000;
  return Math.round(n / 10000) * 10000;
}

function generateNiceAmounts(min: number, max: number): number[] {
  const amounts = new Set<number>();
  amounts.add(min);

  if (max > min) {
    const range = max - min;
    if (range > 1) {
      const step = range / 3;
      const mid1 = roundToNiceNumber(min + step);
      if (mid1 > min && mid1 < max) {
        amounts.add(mid1);
      }
      const mid2 = roundToNiceNumber(min + 2 * step);
      if (mid2 > min && mid2 < max) {
        amounts.add(mid2);
      }
    }
  }
  amounts.add(max);

  return Array.from(amounts)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

export class UserHandlers {
  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService();
  }

  private getSession(userId: string): DepositSession {
    if (!depositSessions.has(userId)) {
      depositSessions.set(userId, {});
    }
    return depositSessions.get(userId)!;
  }

  private clearSession(userId: string): void {
    depositSessions.delete(userId);
  }

  private getWithdrawSession(userId: string): WithdrawSession {
    if (!withdrawSessions.has(userId)) {
      withdrawSessions.set(userId, {});
    }
    return withdrawSessions.get(userId)!;
  }

  private clearWithdrawSession(userId: string): void {
    withdrawSessions.delete(userId);
  }

  async handleDepositCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    this.clearSession(userId);

    const message =
      "💰 *Пополнение баланса*\n\n" + "Выберите валюту для пополнения:";

    const currencies = {
      RUB: "🇷🇺 Российский рубль (RUB)",
      UZS: "🇺🇿 Узбекский сум (UZS)",
      TJS: "🇹🇯 Таджикский сомони (TJS)",
      KGS: "🇰🇬 Киргизский сом (KGS)",
    };

    const buttons = Object.entries(currencies).map(([code, name]) =>
      Markup.button.callback(name, `deposit_currency_${code}`),
    );

    buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons, { columns: 1 }),
    });
  }

  async handleCurrencySelection(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    const currency = callbackData.replace("deposit_currency_", "");
    const session = this.getSession(userId);
    session.currency = currency;

    const message =
      `💰 *Пополнение баланса*\n\n` +
      `Валюта: ${currency}\n\n` +
      `Выберите или введите сумму пополнения в ${currency}:`;

    const suggestedAmounts = this.suggestedAmounts[currency] || [5000, 10000, 25000, 50000];

    const buttons = suggestedAmounts.map((amount) =>
      Markup.button.callback(`${amount.toLocaleString("ru-RU")} ${currency}`, `deposit_amount_${amount}`),
    );

    buttons.push(
      Markup.button.callback("⌨️ Ввести свою", "deposit_custom_amount"),
    );
    buttons.push(Markup.button.callback("⬅️ Назад", "deposit_back_currency"));
    buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons, { columns: 2 }),
    });
  }





  async handleBankSelection(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    const bankIdStr = callbackData.replace("deposit_bank_", "");
    const bankId = parseInt(bankIdStr, 10);
    if (isNaN(bankId)) {
      await ctx.reply("⚠️ Некорректный ID банка.");
      return;
    }

    const session = this.getSession(userId);
    session.bankId = bankId;

    await this.processDeposit(ctx, userId);
  }

  async handleAmountSelection(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    const amountStr = callbackData.replace("deposit_amount_", "");
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply("⚠️ Некорректная сумма");
      return;
    }

    const session = this.getSession(userId);
    session.amount = amount;
    const currency = session.currency;
    if (!currency) {
        // handle error, session lost
        await ctx.reply("⚠️ Произошла ошибка сессии. Начните заново /deposit.");
        return;
    }

    try {
      const banks = await this.apiService.getFiatBanks(currency, amount);

      if (!banks || banks.length === 0) {
        await ctx.reply("⚠️ Для этой суммы пока нет доступных способов оплаты.");
        return;
      }

      const message =
        `💰 *Выбор банка*\n\n` +
        `Валюта: ${currency}\n` +
        `Сумма: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
        `Выберите банк для оплаты:`;

      const buttons = banks.map((bank) =>
        Markup.button.callback(
          bank.name,
          `deposit_bank_${bank.id}`,
        ),
      );

      buttons.push(Markup.button.callback("⬅️ Назад", `deposit_back_currency`)); // Back to currency selection
      buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons, { columns: 1 }),
      });
    } catch (error) {
      this.clearSession(userId);
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`⚠️ Ошибка при загрузке списка банков: ${message}`);
    }
  }

  private minAmounts: { [key: string]: number } = {
    RUB: 5000,
    UZS: 20000,
    TJS: 25,
    KGS: 300,
  };

  private maxAmounts: { [key: string]: number } = {
    RUB: 200000,
    UZS: 10000000,
    TJS: 18000,
    KGS: 150000,
  };

  private suggestedAmounts: { [key: string]: number[] } = {
    RUB: [5000, 10000, 25000, 50000],
    UZS: [50000, 100000, 500000, 1000000],
    TJS: [100, 500, 1000, 5000],
    KGS: [500, 1000, 5000, 10000],
  };

  async handleCustomAmount(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getSession(userId);
    const currency = session.currency || '';
    const minAmount = this.minAmounts[currency] || 1000;

    await ctx.editMessageText(
      `💰 Введите сумму пополнения в ${currency} (только число):\n\n` +
      `Минимальная сумма: ${minAmount.toLocaleString('ru-RU')} ${currency}\n` +
      (this.maxAmounts[currency] ? `Максимальная сумма: ${this.maxAmounts[currency].toLocaleString('ru-RU')} ${currency}\n\n` : `\n`) +
      "Для отмены отправьте /cancel",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("🚫 Отмена", "cancel_operation"),
        ]),
      },
    );

    // Set waiting state
    session.amount = -1; // Flag to indicate waiting for custom amount
  }

  async handleCustomAmountInput(
    ctx: ServiceBotContext,
    amount: number,
  ): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getSession(userId);
    const currency = session.currency || '';
    const minAmount = this.minAmounts[currency] || 0;

    if (amount <= 0) {
      await ctx.reply(
        "⚠️ Сумма должна быть больше 0. Попробуйте ещё раз или отправьте /cancel",
      );
      return;
    }

    if (minAmount && amount < minAmount) {
      await ctx.reply(
        `⚠️ Минимальная сумма для пополнения: ${minAmount.toLocaleString(
          "ru-RU",
        )} ${currency}\n\n` +
        `Вы указали: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
        `Попробуйте ещё раз или отправьте /cancel`,
      );
      return;
    }

    const maxAmount = this.maxAmounts[currency];
    if (maxAmount && amount > maxAmount) {
      await ctx.reply(
        `⚠️ Максимальная сумма для пополнения: ${maxAmount.toLocaleString(
          "ru-RU",
        )} ${currency}\n\n` +
        `Вы указали: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
        `Попробуйте ещё раз или отправьте /cancel`,
      );
      return;
    }

    session.amount = amount;

    // For non-RUB currencies, now that we have the amount, we can proceed.
    // For RUB, this logic is handled in `handleTextMessage` which proceeds to bank selection.
    // This input handler is now primarily for non-RUB custom amounts.
    if (currency !== 'RUB') {
      await this.processDeposit(ctx, userId);
    }
  }

  private async processDeposit(
    ctx: ServiceBotContext,
    userId: string,
  ): Promise<void> {
    const session = this.getSession(userId);

    const errorMessage = "⚠️ Ошибка: не все данные заполнены. Начните заново с /deposit";
    if (!session.currency || !session.bankId || !session.amount) {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(errorMessage);
      } else {
        await ctx.reply(errorMessage);
      }
      this.clearSession(userId);
      return;
    }

    let loadingMessage;
    if (ctx.callbackQuery) {
      const result = await ctx.editMessageText("⏳ Создаём платёж...");
      if (result === true) {
        // Should not happen in this bot's flow
        this.clearSession(userId);
        return;
      }
      loadingMessage = result;
    } else {
      loadingMessage = await ctx.reply("⏳ Создаём платёж...");
    }

    const chatId = loadingMessage.chat.id;
    const messageId = loadingMessage.message_id;

    try {
      const result = await this.apiService.createFiatTransaction(
        userId,
        session.amount,
        session.bankId,
        session.currency,
      );

      let message = `✅ *Платёж создан!*

💰 *Сумма:* ${session.amount.toLocaleString("ru-RU")} ${session.currency}\n`;

      if (result.exchangeRate) {
        message += `💵 *Курс:* 1 ${session.currency} = ${result.exchangeRate.toFixed(6)} USDT\n`;
      }
      if (result.estimatedUSDT) {
        message += `💎 *Вы получите:* ~${result.estimatedUSDT.toFixed(2)} USDT\n`;
      }

      message += `
🏦 *Реквизиты для оплаты:*
${result.bankName ? `🏛️ Банк: ${result.bankName}\n` : ""}👤 Получатель: ${result.recipientName}
🔢 Номер: \`${result.receiver}\`

‼️ *Важно:*
▪️ Переведите точную сумму: *${session.amount} ${session.currency}*
${result.manual ? `▪️ ${result.manual}\n` : ""}
🆔 ID платежа: \`${result.clientID}\`

⚠️ *Важно: совершите платеж в течении 10 минут и нажмите кнопку 'Я оплатил'*`;

      await ctx.telegram.editMessageText(chatId, messageId, undefined, message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ Я оплатил", `deposit_done_${result.norosId}`)],
        ]),
      });

    } catch (error) {
      let rawMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      let displayMessage = rawMessage;

      if (rawMessage.startsWith("API error: ")) {
        displayMessage = rawMessage.replace("API error: ", "");
      }

      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        `⚠️ Ошибка при создании платежа:\n${displayMessage}\n\nПопробуйте снова с /deposit`,
      );
      this.clearSession(userId);
    }
  }

  async handleBackButton(ctx: ServiceBotContext): Promise<void> {
    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    if (callbackData === "deposit_back_currency") {
      await this.handleDepositCommand(ctx);
    } else if (callbackData === "deposit_back_rub_amount") {
      // Go back to RUB amount selection
      ctx.match = ["deposit_currency_RUB"];
      await this.handleCurrencySelection(ctx);
    } else if (callbackData.startsWith("deposit_back_bank_")) {
      const currency = callbackData.replace("deposit_back_bank_", "");
      ctx.match = [`deposit_currency_${currency}`];
      await this.handleCurrencySelection(ctx);
    }
  }

  async handleDoneButton(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    const norosId = callbackData.replace("deposit_done_", "");

    await ctx.editMessageReplyMarkup(undefined);
    const processingMsg = await ctx.reply("⏳ Подтверждаем ваш платёж...");

    try {
      await this.apiService.confirmFiatTransaction(norosId);
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      await ctx.reply(
        "✅ Спасибо! Ваш платёж подтверждается. Баланс будет пополнен автоматически после проверки.",
      );
    } catch (error) {
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`⚠️ Ошибка при подтверждении платежа: ${message}`);
    } finally {
      this.clearSession(userId);
    }
  }

  async handleBalanceCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;
    try {
      const profile = await this.apiService.getUserProfile(userId);
      const message =
        `💰 *Ваш баланс*\n\n` +
        `💲 Баланс: *${profile.balance.toFixed(2)} USDT*\n\n` +
        `Для пополнения используйте /deposit`;
      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      await ctx.reply("⚠️ Ошибка при получении баланса. Попробуйте позже.");
    }
  }

  async handleFiatHistoryCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    try {
      const history = await this.apiService.getFiatTransactionHistory(userId);

      if (history.length === 0) {
        await ctx.reply("📜 У вас пока нет фиатных транзакций.");
        return;
      }

      let message = "📜 *История фиатных транзакций:*\n\n";

      const filteredHistory = history.filter((tx) => tx.status !== "canceled");

      if (filteredHistory.length === 0) {
        await ctx.reply("📜 У вас пока нет активных фиатных транзакций.");
        return;
      }

      filteredHistory.forEach((tx) => {
        const date = new Date(tx.createdAt).toLocaleString("ru-RU");
        const statusEmoji =
          tx.status === "confirmed" || tx.status === "complete"
            ? "✅"
            : tx.status === "failed" || tx.status === "canceled"
              ? "❌"
              : "⏳";
        const typeEmoji = tx.type === "deposit" ? "💰" : "💸";

        message +=
          `${typeEmoji} *${tx.type === "deposit" ? "Пополнение" : "Вывод"}* ${statusEmoji}\n` +
          `  Сумма: ${tx.fiat_amount ? tx.fiat_amount.toLocaleString("ru-RU") : "0"} ${tx.currency} | ${tx.amount ? tx.amount.toFixed(2) : "0.00"} USDT\n` +
          `  Статус: ${tx.status}\n` +
          `  Дата: ${date}\n\n`;
      });

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      await ctx.reply(
        `⚠️ Ошибка при получении истории транзакций:\n${errorMessage}\n\nПопробуйте позже.`,
      );
    }
  }

  async handleRateCommand(ctx: ServiceBotContext): Promise<void> {
    try {
      const rates = await this.apiService.getFiatRates();
      if (!rates || rates.length === 0) {
        await ctx.reply("⚠️ Не удалось загрузить курсы валют.");
        return;
      }

      let message = "📊 *Текущие курсы покупки 1 USDT:*\n\n";
      rates.forEach((item) => {
        // Calculate X fiat = 1 USDT
        const inverseRate = 1 / item.rate;
        // Check for division by zero or invalid rate
        if (item.rate > 0) {
            message += `  ▪️ \`${inverseRate.toFixed(2)}\` ${item.currency}\n`;
        } else {
            message += `  ▪️ ${item.currency}: Курс недоступен\n`;
        }
      });

      message += "\n_Курс может незначительно отличаться при создании заявки._";

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      await ctx.reply(
        `⚠️ Ошибка при получении курсов:\n${errorMessage}\n\nПопробуйте позже.`,
      );
    }
  }

  async handleSupportCommand(ctx: ServiceBotContext): Promise<void> {
    const supportMessage =
      "🧑‍💻 *Связь с поддержкой*\n\n" +
      "Для получения помощи или решения вопросов, пожалуйста, напишите нашему боту поддержки: " +
      "[t.me/SvaraProSupportbot](https://t.me/SvaraProSupportbot)";

    await ctx.reply(supportMessage, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
    });
  }

  async handleTextMessage(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const depositSession = this.getSession(userId);
    const withdrawSession = this.getWithdrawSession(userId);
    const text =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    if (!text) return;

    // Check if waiting for ANY custom deposit amount
    if (depositSession.awaitingCustomAmount || depositSession.amount === -1) {
      const amount = parseInt(text);
      const currency = depositSession.currency || '';
      const minAmount = this.minAmounts[currency] || 0;

      if (isNaN(amount)) {
        await ctx.reply(
          "⚠️ Пожалуйста, введите число. Попробуйте ещё раз или отправьте /cancel",
        );
        return;
      }

      if (amount <= 0) {
        await ctx.reply(
          "⚠️ Сумма должна быть больше 0. Попробуйте ещё раз или отправьте /cancel",
        );
        return;
      }

      if (minAmount && amount < minAmount) {
        await ctx.reply(
          `⚠️ Минимальная сумма для пополнения: ${minAmount.toLocaleString(
            "ru-RU",
          )} ${currency}\n\n` +
          `Вы указали: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
          `Попробуйте ещё раз или отправьте /cancel`,
        );
        return;
      }

      const maxAmount = this.maxAmounts[currency];
      if (maxAmount && amount > maxAmount) {
        await ctx.reply(
          `⚠️ Максимальная сумма для пополнения: ${maxAmount.toLocaleString(
            "ru-RU",
          )} ${currency}\n\n` +
          `Вы указали: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
          `Попробуйте ещё раз или отправьте /cancel`,
        );
        return;
      }

      // Clear flag and set amount
      depositSession.awaitingCustomAmount = false;
      depositSession.amount = amount;

      // Now that we have the amount, proceed to bank selection for all currencies
      try {
        const banks = await this.apiService.getFiatBanks(currency, amount);

        if (!banks || banks.length === 0) {
          await ctx.reply("⚠️ Для этой суммы пока нет доступных способов оплаты.");
          this.clearSession(userId);
          return;
        }

        const message =
          `💰 *Выбор банка*\n\n` +
          `Валюта: ${currency}\n` +
          `Сумма: ${amount.toLocaleString("ru-RU")} ${currency}\n\n` +
          `Выберите банк для оплаты:`;

        const buttons = banks.map((bank) =>
          Markup.button.callback(
            bank.name,
            `deposit_bank_${bank.id}`,
          ),
        );

        buttons.push(Markup.button.callback("⬅️ Назад", `deposit_back_currency`));
        buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

        await ctx.reply(message, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard(buttons, { columns: 1 }),
        });
      } catch (error) {
        this.clearSession(userId);
        const message = error instanceof Error ? error.message : String(error);
        await ctx.reply(`⚠️ Ошибка при загрузке списка банков: ${message}`);
      }
      return;
    }

    // Check if waiting for withdrawal details
    if (withdrawSession.waitingFor) {
      switch (withdrawSession.waitingFor) {
        case "receiver":
          await this.handleWithdrawReceiverInput(ctx, text);
          break;
        case "bankName":
          await this.handleWithdrawBankNameInput(ctx, text);
          break;
        case "recipientName":
          await this.handleWithdrawRecipientNameInput(ctx, text);
          break;
      }
      return; // Stop further processing
    }

    // Check if waiting for custom withdraw amount
    if (withdrawSession.amount === -1) {
      const amount = parseInt(text);
      if (isNaN(amount)) {
        await ctx.reply(
          "⚠️ Пожалуйста, введите число. Попробуйте ещё раз или отправьте /cancel",
        );
        return;
      }
      await this.handleWithdrawAmountInput(ctx, amount);
      return; // Stop further processing
    }
  }

  async handleCancelCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    this.clearSession(userId);
    this.clearWithdrawSession(userId);

    try {
      // Try to answer callback query if the command was initiated from a button
      await ctx.answerCbQuery("🚫 Операция отменена");
    } catch (error) {
      // Ignore error if it's not a callback query
    }

    const mainMenuMessage = await getMainMenuMessage(this.apiService, userId, "🚫 Операция отменена.");

    // Just send the message, the reply keyboard is persistent
    await ctx.reply(mainMenuMessage, {
      parse_mode: "Markdown",
    });
  }

  // --- WITHDRAW FLOW ---

  async handleWithdrawCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;
    
    this.clearWithdrawSession(userId);

    const message =
      "💸 *Вывод средств*\n\n" + "Выберите валюту для вывода:";

    const currencies = {
      RUB: "🇷🇺 Российский рубль (RUB)",
      UZS: "🇺🇿 Узбекский сум (UZS)",
      TJS: "🇹🇯 Таджикский сомони (TJS)",
      KGS: "🇰🇬 Киргизский сом (KGS)",
    };

    const buttons = Object.entries(currencies)
      .map(([code, name]) =>
        Markup.button.callback(name, `withdraw_currency_${code}`),
      );

    buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons, { columns: 1 }),
    });
  }

  async handleWithdrawCurrencySelection(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    const currency = callbackData.replace("withdraw_currency_", "");
    const session = this.getWithdrawSession(userId);
    session.currency = currency;

    session.waitingFor = "receiver";
    await ctx.editMessageText(
      `💸 *Реквизиты для вывода*\n\n` +
      `Валюта: ${currency}\n\n` +
      `Введите номер карты/счета для получения средств:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("🚫 Отмена", "cancel_operation")
        ])
      }
    );
  }

  async handleWithdrawReceiverInput(ctx: ServiceBotContext, receiver: string): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const cleanedReceiver = receiver.replace(/\s/g, '');

    const session = this.getWithdrawSession(userId);
    session.receiver = cleanedReceiver;
    session.waitingFor = "bankName";

    await ctx.reply(
      `🏦 Введите название банка получателя:\n\n` +
      `Например: Сбербанк\n\n` +
      `Для отмены отправьте /cancel`
    );
  }

  async handleWithdrawBankNameInput(ctx: ServiceBotContext, bankName: string): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getWithdrawSession(userId);
    session.bankName = bankName;
    session.waitingFor = "recipientName";

    await ctx.reply(
      `👤 Введите ФИО получателя полностью:\n\n` +
      `Например: Иванов Иван Иванович\n\n` +
      `Для отмены отправьте /cancel`
    );
  }

  async handleWithdrawRecipientNameInput(ctx: ServiceBotContext, recipientName: string): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getWithdrawSession(userId);
    session.recipientName = recipientName;
    session.waitingFor = undefined; // Done with details

    await ctx.reply(
      `💰 Введите сумму для вывода в ${session.currency} (только число):\n\n` +
      `Например: ${session.currency === 'RUB' ? '10000' : '20000'}\n\n` +
      `Для отмены отправьте /cancel`
    );
    session.amount = -1; // Flag to indicate waiting for amount
  }

  async handleWithdrawAmountInput(ctx: ServiceBotContext, amount: number): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getWithdrawSession(userId);
    if (amount <= 0) {
      await ctx.reply("⚠️ Сумма должна быть больше 0. Попробуйте ещё раз или отправьте /cancel");
      return;
    }
    session.amount = amount;
    await this.processWithdraw(ctx, userId);
  }

  private async processWithdraw(ctx: Context, userId: string): Promise<void> {
    const session = this.getWithdrawSession(userId);

    if (!session.currency || !session.amount || !session.receiver || !session.bankName || !session.recipientName) {
      await ctx.reply("⚠️ Ошибка: не все данные для вывода заполнены. Начните заново с /withdraw");
      this.clearWithdrawSession(userId);
      return;
    }

    const processingMsg = await ctx.reply("⏳ Создаём заявку на вывод...");

    try {
      const result = await this.apiService.createFiatWithdraw(
        userId,
        session.amount,
        session.currency,
        session.receiver,
        session.bankName,
        session.recipientName,
      );

      const message = `✅ *Заявка на вывод создана!*

💸 *Сумма:* ${session.amount.toLocaleString("ru-RU")} USDT
🏦 *Банк:* ${session.bankName}
👤 *Получатель:* ${session.recipientName}
🔢 *Реквизиты:* \`${session.receiver}\`

Статус заявки можно будет отслеживать в истории операций.

🆔 ID заявки: \`${result.payoutId}\``;

      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      await ctx.reply(message, { parse_mode: "Markdown" });

      this.clearWithdrawSession(userId);
    } catch (error) {
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);

      let rawMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      let displayMessage = rawMessage;

      // Translate known errors
      if (rawMessage.includes("Insufficient balance")) {
        displayMessage = "Недостаточно средств для вывода.";
      } else if (rawMessage.includes("минимальный лимит по валюте")) {
        const amountMatch = rawMessage.match(/\[(\d+\.?\d*)\]/g);
        if (amountMatch && amountMatch.length >= 2 && amountMatch[0] && amountMatch[1]) {
          const sentAmount = parseFloat(amountMatch[0].replace(/[\[\]]/g, ''));
          const minLimit = parseFloat(amountMatch[1].replace(/[\[\]]/g, ''));
          displayMessage = `Минимальная сумма для вывода: ${minLimit.toLocaleString('ru-RU')} ${session.currency}. Вы запросили: ${sentAmount.toLocaleString('ru-RU')} ${session.currency}.`;
        } else {
          displayMessage = "Сумма вывода не соответствует установленным лимитам.";
        }
      } else if (rawMessage.includes("Unsupported fiat currency")) {
        displayMessage = "Выбранная валюта не поддерживается для вывода.";
      } else if (rawMessage.includes("Unsupported token")) {
        displayMessage = "Выбранный способ оплаты не поддерживается для вывода.";
      } else if (rawMessage.includes("Amount must be greater than 0")) {
        displayMessage = "Сумма вывода должна быть больше нуля.";
      } else if (rawMessage.includes("Invalid receiver")) {
        displayMessage = "Указаны неверные реквизиты получателя.";
      }

      await ctx.reply(
        `⚠️ Ошибка при создании заявки на вывод:\n${displayMessage}\n\nПопробуйте снова с /withdraw`,
      );
      this.clearWithdrawSession(userId);
    }
  }

  async handleWithdrawBackButton(ctx: ServiceBotContext): Promise<void> {
    const callbackData = ctx.match?.[0];
    if (!callbackData) return;

    if (callbackData === "withdraw_back_currency") {
      await this.handleWithdrawCommand(ctx);
    }
  }
}