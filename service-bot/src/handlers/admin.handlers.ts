import { ServiceBotContext } from "../types/index.js";
import { AdminService } from "../services/admin.service.js";
import { UsersService } from "../services/users.service.js";
import { StatsService } from "../services/stats.service.js";
import { getMessage } from "../locales/index.js";

import { ApiService } from "../services/api.service.js";

export class AdminHandlers {
  private apiService: ApiService;

  constructor(
    private adminService: AdminService,
    private usersService: UsersService,
    private statsService: StatsService,
  ) {
    this.apiService = new ApiService();
  }

  // Обработка команды /admin_menu
  async handleAdminMenuCommand(ctx: ServiceBotContext) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const locale = "ru";

    // Проверяем, есть ли пользователь в списке админов
    if (!this.adminService.isInAdminList(telegramId)) {
      await ctx.reply(getMessage(locale, "admin.notInAdminList"));
      return;
    }

    // Проверяем, авторизован ли уже
    if (this.adminService.isAuthenticated(telegramId)) {
      await this.showAdminMenu(ctx);
      return;
    }

    // Проверяем, есть ли пароль
    const hasPassword = await this.adminService.hasPassword(telegramId);

    if (!hasPassword) {
      // Первый вход - создаем пароль
      this.adminService.setLoginState(telegramId, {
        telegramId,
        awaitingPassword: false,
        awaitingNewPassword: true,
      });

      await ctx.reply(getMessage(locale, "admin.firstTimeAdmin"));
    } else {
      // Есть пароль - вводим
      this.adminService.setLoginState(telegramId, {
        telegramId,
        awaitingPassword: true,
        awaitingNewPassword: false,
      });

      await ctx.reply(getMessage(locale, "admin.enterPassword"));
    }
  }

  // Обработка ввода пароля, суммы или реквизитов
  async handlePasswordInput(ctx: ServiceBotContext) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const locale = "ru";

    // Проверяем, ожидается ли ввод для вывода средств из системного кошелька
    const withdrawSession = this.adminService.getWithdrawSession(telegramId);
    if (withdrawSession) {
      if (!ctx.message || !("text" in ctx.message)) return;
      const text = ctx.message.text;
      if (!text) return;

      switch (withdrawSession.step) {
        case 'details': // We reuse 'details' sequence for number -> bank -> owner
          if (!withdrawSession.number) {
            await this.handleSystemWithdrawReceiverInput(ctx, text);
          } else if (!withdrawSession.bankname) {
            await this.handleSystemWithdrawBankNameInput(ctx, text);
          } else if (!withdrawSession.owner) {
            await this.handleSystemWithdrawOwnerInput(ctx, text);
          }
          break;
        case 'amount':
          const amount = parseFloat(text);
          if (isNaN(amount)) {
            await ctx.reply("⚠️ Пожалуйста, введите корректное число.");
            return;
          }
          await this.handleSystemWithdrawAmountInput(ctx, amount);
          break;
      }
      return;
    }

    // Проверяем, ожидается ли ввод суммы для изменения баланса
    const balanceState = this.adminService.getBalanceState(telegramId);
    if (balanceState) {
      if (!ctx.message || !("text" in ctx.message)) return;
      const amount = ctx.message.text;
      if (!amount) return;

      await this.handleBalanceAmountInput(ctx, amount);
      return;
    }

    // Проверяем, ожидается ли поиск
    if (this.adminService.isInSearchState(telegramId)) {
      if (!ctx.message || !("text" in ctx.message)) return;
      const query = ctx.message.text;
      if (!query) return;

      await this.showSearchResults(ctx, query);
      this.adminService.clearSearchState(telegramId);
      return;
    }

    // Проверяем, ожидается ли ввод пароля
    const loginState = this.adminService.getLoginState(telegramId);
    if (!loginState) return;

    if (!ctx.message || !("text" in ctx.message)) return;
    const password = ctx.message.text;
    if (!password) return;

    // Проверяем формат пароля
    if (!this.adminService.validatePassword(password)) {
      await ctx.reply(getMessage(locale, "errors.invalidPassword"));
      return;
    }

    if (loginState.awaitingNewPassword) {
      // Создаем новый пароль
      const success = await this.adminService.createPassword(
        telegramId,
        password,
      );

      if (success) {
        // Авторизуем сразу после создания пароля
        this.adminService.setSession(telegramId, {
          telegramId,
          isAuthenticated: true,
          loginAttempts: 0,
          lastAttemptTime: Date.now(),
        });

        this.adminService.clearLoginState(telegramId);
        await ctx.reply(getMessage(locale, "success.passwordCreated"));
        await this.showAdminMenu(ctx);
      } else {
        await ctx.reply(getMessage(locale, "errors.serverError"));
        this.adminService.clearLoginState(telegramId);
      }
    } else if (loginState.awaitingPassword) {
      // Проверяем существующий пароль
      const isValid = await this.adminService.verifyPassword(
        telegramId,
        password,
      );

      if (isValid) {
        // Успешная авторизация
        this.adminService.setSession(telegramId, {
          telegramId,
          isAuthenticated: true,
          loginAttempts: 0,
          lastAttemptTime: Date.now(),
        });

        this.adminService.clearLoginState(telegramId);
        await ctx.reply(getMessage(locale, "success.loginSuccess"));
        await this.showAdminMenu(ctx);
      } else {
        // Неверный пароль
        await ctx.reply(getMessage(locale, "admin.wrongPassword"));
        this.adminService.clearLoginState(telegramId);
      }
    }
  }

  // Показать админ-меню
  async showAdminMenu(ctx: ServiceBotContext) {
    const locale = "ru";

    await ctx.reply(getMessage(locale, "admin.menu"), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: getMessage(locale, "admin.users"),
              callback_data: "admin_users_1",
            },
            {
              text: getMessage(locale, "admin.stats"),
              callback_data: "admin_stats",
            },
          ],
          [
            {
              text: "🏦 Кошелек системы",
              callback_data: "admin_system_wallet",
            }
          ]
        ],
      },
    });
  }

  // System Wallet Logic
  async showSystemWallet(ctx: ServiceBotContext) {
    try {
      const { balance } = await this.apiService.getSystemWalletBalance();
      const message = `🏦 *Кошелек системы*\n\n💰 Баланс: *${balance.toFixed(2)} USDT*`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💸 Вывести средства', callback_data: 'admin_system_withdraw_start' }
            ],
            [
              { text: '🔄 Обнулить баланс', callback_data: 'admin_system_wallet_reset' }
            ],
            [
              { text: '⬅️ Назад', callback_data: 'admin_menu' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error("Show system wallet error:", error);
      await ctx.reply("❌ Ошибка получения баланса кошелька.");
    }
  }

  async handleSystemWithdrawStart(ctx: ServiceBotContext) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    this.adminService.clearWithdrawSession(telegramId);

    const currencies = {
      RUB: "🇷🇺 Российский рубль (RUB)",
      UZS: "🇺🇿 Узбекский сум (UZS)",
      TJS: "🇹🇯 Таджикский сомони (TJS)",
      KGS: "🇰🇬 Киргизский сом (KGS)",
    };

    const buttons = Object.entries(currencies).map(([code, name]) => ([
      { text: name, callback_data: `admin_system_withdraw_currency_${code}` }
    ]));

    buttons.push([{ text: "🚫 Отмена", callback_data: "admin_system_wallet" }]);

    await ctx.reply("💸 *Вывод средств из системного кошелька*\n\nВыберите валюту:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  }

  async handleSystemWithdrawCurrency(ctx: ServiceBotContext, currency: string) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    this.adminService.setWithdrawSession(telegramId, {
      currency,
      step: 'details',
    });

    await ctx.reply(
      `💸 *Реквизиты для вывода*\n\n` +
      `Валюта: ${currency}\n\n` +
      `Введите номер карты/сичта получателя:`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '🚫 Отмена', callback_data: 'admin_system_wallet' }]]
        }
      }
    );
  }

  async handleSystemWithdrawReceiverInput(ctx: ServiceBotContext, number: string) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = this.adminService.getWithdrawSession(telegramId);
    if (!session) return;

    session.number = number.replace(/\s/g, '');
    this.adminService.setWithdrawSession(telegramId, session);

    await ctx.reply("🏦 Введите название банка получателя (например: Сбербанк):");
  }

  async handleSystemWithdrawBankNameInput(ctx: ServiceBotContext, bankname: string) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = this.adminService.getWithdrawSession(telegramId);
    if (!session) return;

    session.bankname = bankname;
    this.adminService.setWithdrawSession(telegramId, session);

    await ctx.reply("👤 Введите ФИО получателя полностью:");
  }

  async handleSystemWithdrawOwnerInput(ctx: ServiceBotContext, owner: string) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = this.adminService.getWithdrawSession(telegramId);
    if (!session) return;

    session.owner = owner;
    session.step = 'amount';
    this.adminService.setWithdrawSession(telegramId, session);

    await ctx.reply(
      `💰 Введите сумму для вывода в ${session.currency} (только число):`
    );
  }

  async handleSystemWithdrawAmountInput(ctx: ServiceBotContext, amount: number) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = this.adminService.getWithdrawSession(telegramId);
    if (!session) return;

    if (amount <= 0) {
      await ctx.reply("⚠️ Сумма должна быть больше 0.");
      return;
    }

    session.amount = amount;
    session.step = 'confirm';
    this.adminService.setWithdrawSession(telegramId, session);

    const message = `✅ *Подтверждение вывода*\n\n` +
      `💸 Валюта: ${session.currency}\n` +
      `💰 Сумма: ${session.amount}\n` +
      `🔢 Реквизиты: ${session.number}\n` +
      `🏦 Банк: ${session.bankname}\n` +
      `👤 Получатель: ${session.owner}\n\n` +
      `Все верно?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: 'admin_system_withdraw_confirm' },
            { text: '🚫 Отмена', callback_data: 'admin_system_wallet' }
          ]
        ]
      }
    });
  }

  async handleSystemWithdrawConfirm(ctx: ServiceBotContext) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const session = this.adminService.getWithdrawSession(telegramId);
    if (!session || !session.amount || !session.currency || !session.number || !session.bankname || !session.owner) {
      await ctx.reply("⚠️ Ошибка сессии. Начните заново.");
      return;
    }

    try {
      await ctx.editMessageText("⏳ Создаём заявку на вывод...");
      const result = await this.apiService.createSystemWalletWithdraw(
        telegramId,
        session.amount,
        session.currency,
        session.number,
        session.bankname,
        session.owner
      );

      await ctx.editMessageText(
        `✅ *Заявка успешно создана!*\n\nID: \`${result.payoutId}\`\nСтатус: ${result.status}`,
        { parse_mode: 'Markdown' }
      );
      this.adminService.clearWithdrawSession(telegramId);
    } catch (error) {
      console.error("System withdraw error:", error);
      let msg = "Ошибка при создании заявки.";
      if (error instanceof Error) msg = error.message;
      await ctx.editMessageText(`❌ ${msg}`);
      this.adminService.clearWithdrawSession(telegramId);
    }
  }

  // Показать список пользователей
  async showUsers(ctx: ServiceBotContext, page: number = 1) {
    const locale = "ru";

    try {
      const response = await this.usersService.getUsers(page, 10);
      const { users, total } = response;
      const currentPage = parseInt(response.page as any, 10);

      if (users.length === 0) {
        await ctx.reply(getMessage(locale, "admin.noUsers"), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: getMessage(locale, "admin.back"),
                  callback_data: "admin_menu",
                },
              ],
            ],
          },
        });
        return;
      }

      const totalPages = Math.ceil(total / 10);
      const keyboard = [];

      // Кнопки пользователей
      for (const user of users) {
        let displayName = user.username || user.firstName || user.telegramId;
        // Убираем экранирование для отображения в кнопке
        displayName = displayName.replace(/\\/g, "");
        keyboard.push([
          {
            text: `${displayName} (${user.balance} USDT)`,
            callback_data: `admin_user_${user.telegramId}`,
          },
        ]);
      }

      // Навигация
      const navRow = [];
      if (currentPage > 1) {
        navRow.push({
          text: getMessage(locale, "admin.prev"),
          callback_data: `admin_users_${currentPage - 1}`,
        });
      }
      if (currentPage < totalPages) {
        navRow.push({
          text: getMessage(locale, "admin.next"),
          callback_data: `admin_users_${currentPage + 1}`,
        });
      }
      if (navRow.length > 0) {
        keyboard.push(navRow);
      }

      // Кнопки поиска и назад
      keyboard.push([
        {
          text: getMessage(locale, "admin.search"),
          callback_data: "admin_search",
        },
        { text: getMessage(locale, "admin.back"), callback_data: "admin_menu" },
      ]);

      const message = `${getMessage(locale, "admin.totalUsers")} ${total}\n${getMessage(locale, "admin.showingUsers")} ${(currentPage - 1) * 10 + 1}-${Math.min(currentPage * 10, total)}`;

      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("Show users error:", error);
      await ctx.reply(getMessage(locale, "errors.serverError"));
    }
  }

  // Функция для экранирования Markdown
  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  }

  // Показать информацию о пользователе
  async showUserInfo(ctx: ServiceBotContext, telegramId: string) {
    const locale = "ru";

    try {
      const user = await this.usersService.getUserById(telegramId);

      if (!user) {
        await ctx.reply(
          `❌ Пользователь с ID \`${telegramId}\` не найден в системе.`,
          {
            parse_mode: "Markdown",
          },
        );
        return;
      }

      const message =
        `👤 **Информация о пользователе**\n\n` +
        `🆔 ID: \`${user.telegramId}\`\n` +
        `👤 Имя: ${user.firstName || "Не указано"}\n` +
        `📝 Username: ${user.username ? "@" + this.escapeMarkdown(user.username) : "Не указан"}\n` +
        `💰 Баланс: ${user.balance} USDT\n` +
        `🎁 Реферальный баланс: ${user.refBalance} USDT\n` +
        `📊 Реферальный бонус: ${user.refBonus}%\n` +
        `💳 Общие депозиты: ${user.totalDeposit} USDT\n` +
        `🔗 Кошелек: ${user.walletAddress ? this.escapeMarkdown(user.walletAddress) : "Не указан"}`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getMessage(locale, "admin.addBalance"),
                callback_data: `admin_add_balance_${telegramId}`,
              },
              {
                text: getMessage(locale, "admin.removeBalance"),
                callback_data: `admin_remove_balance_${telegramId}`,
              },
            ],
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_users_1",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Show user info error:", error);
      await ctx.reply(getMessage(locale, "admin.userNotFound"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_users_1",
              },
            ],
          ],
        },
      });
    }
  }

  // Показать статистику
  async showStats(ctx: ServiceBotContext, filter: 'all' | 'crypto' | 'fiat' = 'all') {
    const locale = "ru";

    try {
      const stats = await this.statsService.getStats();

      let message = `📊 **Статистика**\n\n`;

      const formatPeriod = (periodName: string, periodStats: any) => {
        let result = `📅 **${periodName}**\n`;

        if (!periodStats) {
          return result + "Нет данных\n";
        }

        if (filter === 'all') {
          result += `💰 Вводы: ${(periodStats.deposits || 0).toFixed(2)} USDT\n`;
          result += `💸 Выводы: ${(periodStats.withdrawals || 0).toFixed(2)} USDT\n`;
          result += `  ├─ 🔷 Крипта: ${(periodStats.crypto?.deposits || 0).toFixed(2)} / ${(periodStats.crypto?.withdrawals || 0).toFixed(2)} USDT\n`;
          result += `  └─ 💵 Фиат: ${(periodStats.fiat?.deposits || 0).toFixed(2)} / ${(periodStats.fiat?.withdrawals || 0).toFixed(2)} USDT\n`;
        } else if (filter === 'crypto') {
          result += `🔷 **Крипта**\n`;
          result += `💰 Вводы: ${(periodStats.crypto?.deposits || 0).toFixed(2)} USDT\n`;
          result += `💸 Выводы: ${(periodStats.crypto?.withdrawals || 0).toFixed(2)} USDT\n`;
        } else if (filter === 'fiat') {
          result += `💵 **Фиат**\n`;
          result += `💰 Вводы: ${(periodStats.fiat?.deposits || 0).toFixed(2)} USDT\n`;
          result += `💸 Выводы: ${(periodStats.fiat?.withdrawals || 0).toFixed(2)} USDT\n`;
        }

        return result;
      };

      message += formatPeriod(getMessage(locale, "admin.period.day"), stats.day) + '\n';
      message += formatPeriod(getMessage(locale, "admin.period.week"), stats.week) + '\n';
      message += formatPeriod(getMessage(locale, "admin.period.month"), stats.month) + '\n';
      message += formatPeriod(getMessage(locale, "admin.period.total"), stats.total);

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: filter === 'all' ? '✅ Всё' : 'Всё',
                callback_data: "admin_stats_all",
              },
              {
                text: filter === 'crypto' ? '✅ Крипта' : 'Крипта',
                callback_data: "admin_stats_crypto",
              },
              {
                text: filter === 'fiat' ? '✅ Фиат' : 'Фиат',
                callback_data: "admin_stats_fiat",
              },
            ],
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_menu",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Show stats error:", error);
      await ctx.reply(getMessage(locale, "errors.serverError"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_menu",
              },
            ],
          ],
        },
      });
    }
  }

  // Проверка авторизации админа
  isAdminAuthenticated(telegramId: string): boolean {
    return this.adminService.isAuthenticated(telegramId);
  }

  // Обработка добавления баланса
  async handleAddBalance(ctx: ServiceBotContext, telegramId: string) {
    const locale = "ru";

    // Сохраняем состояние для ожидания ввода суммы
    this.adminService.setBalanceState(ctx.from!.id.toString(), {
      action: "add",
      telegramId: telegramId,
    });

    await ctx.reply(getMessage(locale, "admin.enterAmount"), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: getMessage(locale, "admin.back"),
              callback_data: `admin_user_${telegramId}`,
            },
          ],
        ],
      },
    });
  }

  // Обработка удаления баланса
  async handleRemoveBalance(ctx: ServiceBotContext, telegramId: string) {
    const locale = "ru";

    // Сохраняем состояние для ожидания ввода суммы
    this.adminService.setBalanceState(ctx.from!.id.toString(), {
      action: "remove",
      telegramId: telegramId,
    });

    await ctx.reply(getMessage(locale, "admin.enterAmount"), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: getMessage(locale, "admin.back"),
              callback_data: `admin_user_${telegramId}`,
            },
          ],
        ],
      },
    });
  }

  // Обработка ввода суммы для изменения баланса
  async handleBalanceAmountInput(ctx: ServiceBotContext, amount: string) {
    const locale = "ru";
    const telegramId = ctx.from!.id.toString();
    const balanceState = this.adminService.getBalanceState(telegramId);

    if (!balanceState) {
      await ctx.reply(getMessage(locale, "errors.invalidCommand"));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await ctx.reply(getMessage(locale, "errors.invalidAmount"));
      return;
    }

    try {
      const operation = balanceState.action === "remove" ? "remove" : "add";
      await this.usersService.updateBalance(
        balanceState.telegramId,
        numAmount,
        operation,
      );

      const user = await this.usersService.getUserById(balanceState.telegramId);

      if (!user) {
        await ctx.reply(
          `❌ Пользователь с ID \`${balanceState.telegramId}\` не найден в системе.`,
          {
            parse_mode: "Markdown",
          },
        );
        return;
      }

      const actionText =
        balanceState.action === "add" ? "добавлено" : "списано";

      await ctx.reply(
        `${getMessage(locale, "admin.balanceUpdated")} ${actionText} ${numAmount} USDT\nНовый баланс: ${user.balance} USDT`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: getMessage(locale, "admin.back"),
                  callback_data: `admin_user_${balanceState.telegramId}`,
                },
              ],
            ],
          },
        },
      );

      // Очищаем состояние
      this.adminService.clearBalanceState(telegramId);
    } catch (error) {
      console.error("Update balance error:", error);
      await ctx.reply(getMessage(locale, "errors.serverError"));
    }
  }

  // Показать поиск пользователей
  async showSearchPrompt(ctx: ServiceBotContext) {
    const locale = "ru";

    // Устанавливаем состояние поиска
    this.adminService.setSearchState(ctx.from!.id.toString());

    await ctx.reply(
      "🔍 Введите username, имя или ID пользователя для поиска:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_users_1",
              },
            ],
          ],
        },
      },
    );
  }

  // Показать результаты поиска
  async showSearchResults(ctx: ServiceBotContext, query: string) {
    const locale = "ru";

    try {
      const users = await this.usersService.searchUsers(query);

      if (users.length === 0) {
        await ctx.reply("🔍 Пользователи не найдены", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: getMessage(locale, "admin.back"),
                  callback_data: "admin_users_1",
                },
              ],
            ],
          },
        });
        return;
      }

      const keyboard = [];

      // Кнопки найденных пользователей
      for (const user of users) {
        let displayName = user.username || user.firstName || user.telegramId;
        displayName = displayName.replace(/\\/g, "");
        keyboard.push([
          {
            text: `${displayName} (${user.balance} USDT)`,
            callback_data: `admin_user_${user.telegramId}`,
          },
        ]);
      }

      // Кнопка назад
      keyboard.push([
        {
          text: getMessage(locale, "admin.back"),
          callback_data: "admin_users_1",
        },
      ]);

      await ctx.reply(`🔍 Найдено пользователей: ${users.length}`, {
        reply_markup: { inline_keyboard: keyboard },
      });
    } catch (error) {
      console.error("Search error:", error);
      await ctx.reply(getMessage(locale, "errors.serverError"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getMessage(locale, "admin.back"),
                callback_data: "admin_users_1",
              },
            ],
          ],
        },
      });
    }
  }

  // System Wallet Reset Logic
  async handleSystemWalletReset(ctx: ServiceBotContext) {
    const message =
      `⚠️ *ВНИМАНИЕ*\\n\\n` +
      `Вы собираетесь обнулить свой личный баланс администратора.\\n\\n` +
      `Это действие *необратимо*. Ваш баланс станет 0 USDT.\\n\\n` +
      `Вы уверены?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: 'admin_system_wallet_reset_confirm' },
            { text: '❌ Отмена', callback_data: 'admin_system_wallet' }
          ]
        ]
      }
    });
  }

  async handleSystemWalletResetConfirm(ctx: ServiceBotContext) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    try {
      const adminUser = await this.usersService.getUserById(telegramId);
      if (!adminUser) {
        throw new Error("Не удалось найти пользователя-администратора.");
      }

      if (adminUser.balance > 0) {
        await this.usersService.updateBalance(
          telegramId,
          adminUser.balance,
          "remove"
        );
      }

      await ctx.reply(
        '✅ *Ваш личный баланс администратора успешно обнулен.*',
        { parse_mode: 'Markdown' }
      );
      // Show updated wallet view
      await this.showSystemWallet(ctx);
    } catch (error) {
      console.error('Error resetting admin balance:', error);
      await ctx.reply(
        '❌ Ошибка при обнулении вашего баланса. Попробуйте позже.',
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '⬅️ Назад', callback_data: 'admin_system_wallet' }
            ]]
          }
        }
      );
    }
  }
}
