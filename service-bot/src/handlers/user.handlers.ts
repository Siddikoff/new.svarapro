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
      KZT: "🇰🇿 Казахстанский тенге (KZT)",
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

    try {
      const banks = await this.apiService.getFiatBanks(currency);

      if (!banks || banks.length === 0) {
        await ctx.reply("⚠️ Для этой валюты пока нет доступных способов оплаты (банков).");
        return;
      }

      const message =
        `💰 *Выбор банка*\n\n` +
        `Валюта: ${currency}\n\n` +
        `Выберите банк для оплаты:`;

      const buttons = banks.map((bank) =>
        Markup.button.callback(
          bank.name,
          `deposit_bank_${bank.id}`,
        ),
      );

      buttons.push(Markup.button.callback("⬅️ Назад", "deposit_back_currency"));
      buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons, { columns: 2 }),
      });
    } catch (error) {
      this.clearSession(userId);
      await ctx.reply(`⚠️ Ошибка при загрузке списка банков: ${error.message}`);
    }
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

    // TODO: The API does not provide min/max amounts. Using generic values for now.
    const amounts = [1000, 2000, 5000, 10000];
    const currency = session.currency || '';

    const message =
      `💰 *Выбор суммы*\n\n` +
      `Валюта: ${currency}\n\n` +
      `Выберите сумму или введите свою:`;

    const buttons = amounts.map((amount: number) =>
      Markup.button.callback(
        `${amount.toLocaleString("ru-RU")} ${currency}`,
        `deposit_amount_${amount}`,
      ),
    );

    buttons.push(
      Markup.button.callback("⌨️ Ввести свою", "deposit_custom_amount"),
    );
    buttons.push(
      Markup.button.callback("⬅️ Назад", `deposit_back_bank_${currency}`), // Updated back button
    );
    buttons.push(Markup.button.callback("🚫 Отмена", "cancel_operation"));

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons, { columns: 2 }),
    });
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

    await this.processDeposit(ctx, userId);
  }

  async handleCustomAmount(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    await ctx.editMessageText(
      "💰 Введите сумму пополнения (только число):\n\n" +
        "Например: 5000\n\n" +
        "Для отмены отправьте /cancel",
      {
        parse_mode: "Markdown",
      },
    );

    // Set waiting state
    const session = this.getSession(userId);
    session.amount = -1; // Flag to indicate waiting for custom amount
  }

  async handleCustomAmountInput(
    ctx: ServiceBotContext,
    amount: number,
  ): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const session = this.getSession(userId);
    const currency = session.currency;
    const minAmount = session.minAmount;
    const maxAmount = session.maxAmount;

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

    await this.processDeposit(ctx, userId);
  }

  private async processDeposit(
    ctx: Context,
    userId: string,
  ): Promise<void> {
    const session = this.getSession(userId);

    if (!session.currency || !session.bankId || !session.amount) {
      await ctx.reply(
        "⚠️ Ошибка: не все данные заполнены. Начните заново с /deposit",
      );
      this.clearSession(userId);
      return;
    }

    const processingMsg = await ctx.reply("⏳ Создаём платёж...");

    try {
      const result = await this.apiService.createFiatTransaction(
        userId,
        session.amount,
        session.bankId,
        session.currency,
      );

      const message = `✅ *Платёж создан!*

💰 *Сумма:* ${session.amount.toLocaleString("ru-RU")} ${session.currency}

🏦 *Реквизиты для оплаты:*
🏛️ Банк: ${result.bankName}
👤 Получатель: ${result.recipientName}
🔢 Номер: \`${result.receiver}\`

‼️ *Важно:*
▪️ Переведите точную сумму: *${session.amount} ${session.currency}*
▪️ ${result.manual}

🆔 ID платежа: \`${result.clientID}\``;

      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("✅ Готово", "deposit_done")],
        ]),
      });

      this.clearSession(userId);
    } catch (error) {
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      
      let rawMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      let displayMessage = rawMessage;

      // Clean up API errors that are already in Russian
      if (rawMessage.startsWith("API error: ")) {
        displayMessage = rawMessage.replace("API error: ", "");
      }

      await ctx.reply(
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
    } else if (callbackData.startsWith("deposit_back_bank_")) {
      const currency = callbackData.replace("deposit_back_bank_", "");
      ctx.match = [`deposit_currency_${currency}`];
      await this.handleCurrencySelection(ctx);
    }
  }

  async handleDoneButton(ctx: ServiceBotContext): Promise<void> {
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply(
      "✅ Спасибо! После подтверждения оплаты баланс будет пополнен автоматически.",
    );
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

      history.forEach((tx) => {
        const date = new Date(tx.createdAt).toLocaleString("ru-RU");
        const statusEmoji =
          tx.status === "complete"
            ? "✅"
            : tx.status === "failed"
              ? "❌"
              : "⏳";
        const typeEmoji = tx.type === "deposit" ? "💰" : "💸";

        message +=
          `${typeEmoji} *${tx.type === "deposit" ? "Пополнение" : "Вывод"}* ${statusEmoji}\n` +
          `  Сумма: ${tx.fiat_amount.toLocaleString("ru-RU")} ${tx.currency}\n` +
          `  В USDT: ${tx.amount.toFixed(2)} USDT\n` +
          `  Метод: ${tx.token}\n` +
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

  async handleTextMessage(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const depositSession = this.getSession(userId);
    const withdrawSession = this.getWithdrawSession(userId);
    const text =
      ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";

    if (!text) return;

    // Check if waiting for custom deposit amount
    if (depositSession.amount === -1) {
      const amount = parseInt(text);
      if (isNaN(amount)) {
        await ctx.reply(
          "⚠️ Пожалуйста, введите число. Попробуйте ещё раз или отправьте /cancel",
        );
        return;
      }
      await this.handleCustomAmountInput(ctx, amount);
      return; // Stop further processing
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

/*
  async handleCancelCommand(ctx: ServiceBotContext): Promise<void> {
    const userId = ctx.from?.id?.toString();
    if (!userId) return;

    this.clearSession(userId);
    this.clearWithdrawSession(userId);
    
    await ctx.reply("🚫 Операция отменена.");

    // Show main menu
    const mainMenuMessage = `Выберите действие:`;

    await ctx.reply(mainMenuMessage, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("💰 Пополнить баланс", "start_deposit"),
          Markup.button.callback("💸 Вывести средства", "start_withdraw"),
        ],
        [
          Markup.button.callback("📜 История фиатных переводов", "start_fiat_history"),
        ],
      ]),
    });
  }
  */

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
      KZT: "🇰🇿 Казахстанский тенге (KZT)",
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
      `💰 Введите сумму для вывода в USDT (только число):\n\n` +
      `Например: 50\n\n` +
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