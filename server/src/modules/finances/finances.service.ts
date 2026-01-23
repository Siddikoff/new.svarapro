import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entities/transactions.entity';
import { User } from '../../entities/user.entity';
import { SystemWallet } from '../../entities/system-wallet.entity';
import { ApiService } from '../../services/api.service';
import { NorosService, RubPaymentMethod } from '../../services/noros.service';
import { TransactionGateway } from './transactions.gateway';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TransactionStatusDto } from './dto/transaction-status.dto';
import { TelegramService } from '../../services/telegram.service';
import { CallbackDto } from './dto/callback.dto';
import * as cron from 'node-cron';

@Injectable()
export class FinancesService {
  private readonly logger = new Logger(FinancesService.name);
  private readonly TON_TO_USDT_RATE = 3;
  private readonly supportedCurrencies = ['USDTTON', 'TON'];

  private readonly withdrawalLimits = {
    KGS: { min: 500, max: 150000 },
    UZS: { min: 20000, max: 10000000 },
    RUB: { min: 1000, max: 200000 },
    TJS: { min: 25, max: 18000 },
  };

  // Fee configuration based on currency, type, and method
  private readonly feeConfig = {
    deposit: {
      RUB: {
        CLASSIC: 0.15,    // 15%
        '1_5K': 0.16,     // 16%
        ALFA: 0.12,       // 12%
      },
      UZS: 0.045,         // 4.5%
      KGS: 0.065,         // 6.5%
      TJS: 0.07,          // 7%
    },
    withdraw: {
      RUB: 0.03,          // 3%
      UZS: 0.01,          // 1%
      KGS: 0.02,          // 2%
      TJS: 0.03,          // 3%
    },
  };

  /**
   * Get fee percentage for a transaction
   * @param type - 'deposit' or 'withdraw'
   * @param currency - Currency code (RUB, UZS, KGS)
   * @param method - Optional RUB payment method (CLASSIC, 1_5K, ALFA)
   * @param amount - Optional amount for auto-selecting RUB method
   * @returns Fee as decimal (e.g., 0.15 for 15%)
   */
  private getFeePercentage(
    type: 'deposit' | 'withdraw',
    currency: string,
    method?: RubPaymentMethod,
    amount?: number,
  ): number {
    if (type === 'deposit') {
      if (currency === 'RUB') {
        // Auto-select method based on amount if not provided
        let rubMethod = method;
        if (!rubMethod && amount !== undefined) {
          if (amount >= 1000 && amount < 5000) {
            rubMethod = RubPaymentMethod.SMALL;
          } else {
            rubMethod = RubPaymentMethod.CLASSIC;
          }
        }
        return this.feeConfig.deposit.RUB[rubMethod || 'CLASSIC'] || this.feeConfig.deposit.RUB.CLASSIC;
      }
      return this.feeConfig.deposit[currency] || 0.10; // Default 10% if not configured
    } else {
      return this.feeConfig.withdraw[currency] || 0.10; // Default 10% if not configured
    }
  }

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(SystemWallet)
    private systemWalletRepository: Repository<SystemWallet>,
    private apiService: ApiService,
    private norosService: NorosService,
    private transactionGateway: TransactionGateway,
    @InjectQueue('callback-queue') private callbackQueue: Queue,
    private telegramService: TelegramService,
  ) {
    this.logger.log('FinancesService initialized');
    // Schedule a cron job to run every minute
    cron.schedule('*/1 * * * *', () => {
      this.logger.log('Running cron job to check pending fiat transactions...');
      this.checkPendingFiatTransactions();
    });
  }

  async getFiatRates(): Promise<{ currency: string; rate: number }[]> {
    const currencies = ['RUB', 'UZS', 'TJS', 'KGS'];
    const rates: { currency: string; rate: number }[] = [];

    for (const currency of currencies) {
      try {
        const rate = await this.apiService.getCurrencyRate(currency);
        rates.push({ currency, rate });
      } catch (error) {
        this.logger.error(`Failed to get rate for currency: ${currency}`, error);
        // Skip this currency and continue with the others
      }
    }
    return rates;
  }

  async getSystemWallet(): Promise<SystemWallet> {
    let wallet = await this.systemWalletRepository.findOne({ where: { id: 1 } });
    if (!wallet) {
      wallet = this.systemWalletRepository.create({ id: 1, balance: 0.0 });
      await this.systemWalletRepository.save(wallet);
    }
    return wallet;
  }

  async addToSystemWallet(amount: number): Promise<void> {
    const wallet = await this.getSystemWallet();
    wallet.balance = Number(wallet.balance) + Number(amount);
    await this.systemWalletRepository.save(wallet);
    this.logger.log(`Added ${amount} to system wallet. New balance: ${wallet.balance}`);
  }

  async resetSystemWallet(): Promise<void> {
    const wallet = await this.getSystemWallet();
    const previousBalance = wallet.balance;
    wallet.balance = 0;
    await this.systemWalletRepository.save(wallet);
    this.logger.log(`System wallet reset from ${previousBalance} to 0`);
  }

  async initSystemWalletWithdraw(
    adminTelegramId: string,
    amount: number,
    currency: string,
    number: string,
    bankname: string,
    owner: string,
    method?: RubPaymentMethod,
  ): Promise<{
    transaction: Transaction;
    payoutId: number;
  }> {
    // Basic validation similar to initFiatWithdraw
    if (!amount || amount <= 0) {
      throw new BadRequestException(`Amount must be greater than 0: ${amount}`);
    }

    const wallet = await this.getSystemWallet();

    // Check withdrawal limits
    const limits = this.withdrawalLimits[currency];
    if (limits) {
      if (amount < limits.min || amount > limits.max) {
        throw new BadRequestException(
          `Сумма вывода для ${currency} должна быть между ${limits.min} и ${limits.max}.`,
        );
      }
    }

    // Convert fiat amount to USDT to debit from system wallet
    const exchangeRate = await this.apiService.getCurrencyRate(currency);
    const feePercentage = this.getFeePercentage('withdraw', currency, method);
    const fiatAmount = amount; // User specified amount in fiat currency
    const usdtEquivalent = fiatAmount * exchangeRate; // USDT equivalent of fiat
    const usdtToDebit = usdtEquivalent / (1 - feePercentage); // USDT to debit including fee

    // Check balance in System Wallet
    if (wallet.balance < usdtToDebit) {
      throw new BadRequestException(`Недостаточно средств в кошельке проекта. Требуется: ${usdtToDebit.toFixed(2)} USDT, доступно: ${wallet.balance} USDT`);
    }

    const clientID = uuidv4();

    // Debit USDT from system wallet balance immediately
    wallet.balance -= usdtToDebit;
    await this.systemWalletRepository.save(wallet);

    try {
      const payoutResponse = await this.norosService.createPayout(
        amount,
        currency,
        number,
        bankname,
        owner,
        clientID,
        method,
      );

      // Find admin user to link transaction
      const adminUser = await this.userRepository.findOne({ where: { telegramId: adminTelegramId } });

      const transaction = this.transactionRepository.create({
        user: adminUser || undefined, // Link to admin user if exists in users table, else null (but schema might require user...)
        // Actually, Transaction entity requires user. Admins should be in users table if they use the bot.
        // If admin is NOT in users table (unlikely for bot users), this might fail. 
        // Assuming admin calling this is a bot user.
        type: 'withdraw',
        currency,
        amount: usdtToDebit,
        address: number || 'SYSTEM_WITHDRAW',
        tracker_id: payoutResponse.id.toString(),
        client_transaction_id: clientID,
        status: 'pending',
        payment_provider: 'noros',
        token: bankname,
        fiat_amount: fiatAmount,
        rate: exchangeRate,
        extra: {
          bankName: bankname,
          recipientName: owner,
          rubMethod: method,
          isSystemWithdraw: true, // Mark as system withdraw
          adminId: adminTelegramId
        },
      });

      const savedTransaction = await this.transactionRepository.save(transaction);

      this.logger.log(
        `System wallet withdrawal initiated: payoutId: ${payoutResponse.id}, clientID: ${clientID}, currency: ${currency}, amount: ${amount}, admin: ${adminTelegramId}`,
      );

      return {
        transaction: savedTransaction,
        payoutId: payoutResponse.id,
      };
    } catch (error) {
      // Refund balance on error
      wallet.balance += usdtToDebit;
      await this.systemWalletRepository.save(wallet);
      throw error;
    }
  }
  async checkPendingFiatTransactions() {
    try {
      const pendingTransactions = await this.transactionRepository.find({
        where: {
          status: 'pending',
          payment_provider: 'noros',
        },
      });

      if (pendingTransactions.length === 0) {
        this.logger.log('No pending fiat transactions found.');
        return;
      }

      this.logger.log(
        `Found ${pendingTransactions.length} pending fiat transactions to check.`,
      );

      for (const transaction of pendingTransactions) {
        try {
          if (transaction.client_transaction_id) {
            this.logger.log(
              `Checking status for clientID: ${transaction.client_transaction_id}`,
            );
            await this.processNorosTransactionStatus(transaction.client_transaction_id);
          } else {
            this.logger.warn(
              `Skipping pending transaction ${transaction.id} because it has no client_transaction_id.`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing pending transaction ${transaction.id}:`,
            error,
          );
          // Continue to the next transaction even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in checkPendingFiatTransactions cron job:', error);
    }
  }

  async getBanks(currency: string, amount?: number, method?: RubPaymentMethod): Promise<any[]> {
    this.logger.log(`Fetching banks for currency: ${currency}, amount: ${amount}, method: ${method}`);
    return this.norosService.getBanks(currency, amount, method);
  }

  async initTransaction(
    telegramId: string,
    currency: string,
    type: 'deposit' | 'withdraw',
    amount?: number,
    receiver?: string,
    destTag?: string,
  ): Promise<Transaction> {
    // DEBUG log removed

    if (!this.supportedCurrencies.includes(currency)) {
      this.logger.error(`Unsupported currency: ${currency}`);
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }
    if (type === 'withdraw') {
      if (!amount || amount <= 0) {
        this.logger.error(
          `Amount is required and must be greater than 0 for withdraw: ${amount}`,
        );
        throw new BadRequestException(
          'Amount is required and must be greater than 0 for withdraw',
        );
      }
      if (!receiver || receiver.trim() === '') {
        this.logger.error(
          `Receiver address is required for withdraw: ${receiver}`,
        );
        throw new BadRequestException(
          'Receiver address is required for withdraw',
        );
      }
    }

    const clientTransactionId = uuidv4();
    let address: string | undefined;
    let trackerId: string;

    if (type === 'deposit') {
      const deposit = await this.apiService.createDepositAddress(
        currency,
        clientTransactionId,
      );
      address = deposit.address;
      trackerId = deposit.trackerId;
      if (trackerId.length > 128) {
        this.logger.error(
          `Tracker ID too long: ${trackerId} (length: ${trackerId.length})`,
        );
        throw new BadRequestException(
          'Tracker ID exceeds maximum length of 128 characters',
        );
      }
    } else {
      const withdrawAmount: number = amount!;
      const withdrawReceiver: string = receiver!;
      const withdraw = await this.apiService.createWithdrawAddress(
        currency,
        clientTransactionId,
        withdrawAmount,
        withdrawReceiver,
        destTag,
      );
      trackerId = withdraw.trackerId;
      if (trackerId.length > 128) {
        this.logger.error(
          `Tracker ID too long: ${trackerId} (length: ${trackerId.length})`,
        );
        throw new BadRequestException(
          'Tracker ID exceeds maximum length of 128 characters',
        );
      }
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      this.logger.error(`User not found for telegramId: ${telegramId}`);
      throw new BadRequestException('User not found');
    }

    // Проверяем, не создали ли мы уже транзакцию с таким clientTransactionId
    const existingTransaction = await this.transactionRepository.findOne({
      where: { client_transaction_id: clientTransactionId },
    });
    if (existingTransaction) {
      this.logger.warn(
        `Transaction with clientTransactionId ${clientTransactionId} already exists, returning existing transaction`,
      );
      return existingTransaction;
    }

    if (type === 'withdraw') {
      const withdrawAmount: number = amount!;
      if (user.balance < withdrawAmount) {
        this.logger.error(
          `Insufficient balance for user ${telegramId}: balance=${user.balance}, amount=${withdrawAmount}`,
        );
        throw new BadRequestException('Insufficient balance');
      }
      user.balance -= withdrawAmount;
      await this.userRepository.save(user);
    }

    const transaction = this.transactionRepository.create({
      user: { id: user.id } as User,
      type,
      currency,
      amount: type === 'withdraw' ? amount! : 0,
      address: type === 'withdraw' ? receiver! : address, // Для withdraw используем receiver как address
      tracker_id: trackerId,
      client_transaction_id: clientTransactionId,
      status: 'pending',
    });

    this.logger.log(
      `Transaction initiated: ${trackerId}, type: ${type}, currency: ${currency}, clientTransactionId: ${clientTransactionId}`,
    );
    return await this.transactionRepository.save(transaction);
  }

  async initFiatTransaction(
    telegramId: string,
    amount: number,
    bankId: number,
    currency: string,
    userInfo?: {
      ip?: string;
      ua?: string;
      email?: string;
      id?: string;
      fio?: string;
      card?: string;
    },
    method?: RubPaymentMethod,
  ): Promise<{
    transaction: Transaction;
    // Noros response fields
    receiver: string; // card
    bankName: string; // bankReceiver
    recipientName: string; // cardOwner
    manual: string; // manual instruction
    // Exchange rate info
    exchangeRate: number; // Current exchange rate
    estimatedUSDT: number; // Estimated USDT amount user will receive
    fiatAmountToPay: number; // The final amount in fiat user has to pay
  }> {
    // Basic validation
    if (!amount || amount <= 0) {
      this.logger.error(`Amount must be greater than 0: ${amount}`);
      throw new BadRequestException(`Amount must be greater than 0: ${amount}`);
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      this.logger.error(`User not found for telegramId: ${telegramId}`);
      throw new BadRequestException('User not found');
    }

    const clientID = uuidv4(); // Our internal orderId

    try {
      // Calculate amount with fee
      const feePercentage = this.getFeePercentage('deposit', currency, method, amount);
      // We charge the user an amount such that after our fee, they get the 'amount' they requested
      const amountWithFee = Math.ceil(amount / (1 - feePercentage));

      this.logger.log(
        `Fiat deposit initiated: user wants to get ${amount} ${currency}. With fee, they need to pay ${amountWithFee} ${currency}.`,
      );

      // Noros `createPayin` uses the `/transaction` endpoint
      const payinResponse = await this.norosService.createPayin(
        amountWithFee, // Use amount with fee
        bankId,
        currency,
        clientID, // Pass our internal ID as orderId
        userInfo?.ip,
        userInfo?.fio,
        userInfo?.card,
        userInfo?.id,
        method, // Pass RUB payment method
      );

      // Accept payment terms (PATCH /transaction/{id})
      try {
        await this.norosService.acceptPaymentTerms(payinResponse.id, currency, method, amountWithFee);
        this.logger.log(`Accepted payment terms for transaction ${payinResponse.id}`);
      } catch (error) {
        this.logger.warn(`Could not accept payment terms: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Immediately fetch full transaction details
      const fullTransactionDetails = await this.norosService.getTransactionStatus(
        payinResponse.id,
        currency,
        method,
        amountWithFee, // Use amount with fee
      );

      this.logger.log(`Full transaction details: ${JSON.stringify(fullTransactionDetails)}`);

      if (!fullTransactionDetails.card || !fullTransactionDetails.cardOwner) {
        this.logger.error(
          `Transaction ${payinResponse.id} created but missing payment requisites. Status: ${fullTransactionDetails.status}`,
        );

        try {
          await this.norosService.cancelTransaction(payinResponse.id, currency, method, amountWithFee);
          this.logger.log(`Cancelled incomplete transaction ${payinResponse.id}`);
        } catch (cancelError) {
          this.logger.warn(`Failed to cancel transaction ${payinResponse.id}: ${cancelError instanceof Error ? cancelError.message : String(cancelError)}`);
        }

        throw new BadRequestException(
          'Выбранный банк временно недоступен. Пожалуйста, попробуйте другой банк или повторите попытку позже.',
        );
      }

      const transaction = this.transactionRepository.create({
        user: { id: user.id } as User,
        type: 'deposit',
        currency,
        amount: 0, // Will be updated on status check
        address: fullTransactionDetails.card || 'FIAT_DEPOSIT',
        tracker_id: payinResponse.id.toString(),
        client_transaction_id: clientID,
        status: 'pending',
        payment_provider: 'noros',
        token: fullTransactionDetails.bankReceiver,
        fiat_amount: amountWithFee, // Store the full amount to be paid
        rate: null,
        extra: {
          bankName: fullTransactionDetails.bankReceiver,
          recipientName: fullTransactionDetails.cardOwner,
          manual: fullTransactionDetails.manual,
          rubMethod: method,
          baseFiatAmount: amount, // Store the original requested amount
        },
      });

      const savedTransaction = await this.transactionRepository.save(
        transaction,
      );

      this.logger.log(
        `Noros fiat transaction initiated: norosId: ${payinResponse.id}, clientID: ${clientID}, currency: ${currency}, bankId: ${bankId}, amount: ${amountWithFee}`,
      );

      // Get exchange rate and calculate estimated USDT (based on the clean amount)
      const exchangeRate = await this.apiService.getCurrencyRate(currency);
      const estimatedUSDT = amount * exchangeRate; // User receives USDT equivalent of the base amount

      this.logger.log(
        `Exchange rate for ${currency}: ${exchangeRate}, base amount: ${amount}, estimated USDT: ${estimatedUSDT.toFixed(2)}`,
      );

      return {
        transaction: savedTransaction,
        receiver: fullTransactionDetails.card,
        bankName: fullTransactionDetails.bankReceiver,
        recipientName: fullTransactionDetails.cardOwner,
        manual: fullTransactionDetails.manual,
        exchangeRate,
        estimatedUSDT,
        fiatAmountToPay: amountWithFee,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create Noros fiat transaction: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async initFiatWithdraw(
    telegramId: string,
    amount: number,
    currency: string,
    number: string, // Replaces receiver
    bankname: string, // From old extra object
    owner: string, // From old extra object
    method?: RubPaymentMethod,
  ): Promise<{
    transaction: Transaction;
    payoutId: number;
  }> {
    // Basic validation
    if (!amount || amount <= 0) {
      this.logger.error(`Amount must be greater than 0: ${amount}`);
      throw new BadRequestException(`Amount must be greater than 0: ${amount}`);
    }
    if (!number || typeof number !== 'string' || number.trim() === '') {
      this.logger.error(`Invalid card/account number: ${number}`);
      throw new BadRequestException(`Invalid card/account number`);
    }

    // Withdrawal limits validation
    const limits = this.withdrawalLimits[currency];
    if (limits) {
      if (amount < limits.min || amount > limits.max) {
        throw new BadRequestException(
          `Сумма вывода для ${currency} должна быть между ${limits.min} и ${limits.max}.`,
        );
      }
    }

    const user = await this.userRepository.findOne({ where: { telegramId } });
    if (!user) {
      this.logger.error(`User not found for telegramId: ${telegramId}`);
      throw new BadRequestException('User not found');
    }

    const exchangeRate = await this.apiService.getCurrencyRate(currency);
    const feePercentage = this.getFeePercentage('withdraw', currency, method);

    // The user requests to withdraw 'amount'. We debit them for the full USDT equivalent.
    const usdtToDebit = amount * exchangeRate;
    // The actual fiat amount they receive is the requested amount minus our fee.
    const fiatAmountToReceive = Math.floor(amount * (1 - feePercentage));

    this.logger.log(
      `Withdraw calculation: user requests ${amount} ${currency}. They will receive ${fiatAmountToReceive} ${currency}. Cost to user: ${usdtToDebit.toFixed(2)} USDT. Fee is ${(feePercentage * 100).toFixed(1)}%`,
    );

    // Check balance in USDT
    if (user.balance < usdtToDebit) {
      this.logger.error(
        `Insufficient balance for user ${telegramId}: balance=${user.balance} USDT, required=${usdtToDebit.toFixed(2)} USDT`,
      );
      throw new BadRequestException(`Недостаточно средств. Требуется: ${usdtToDebit.toFixed(2)} USDT, доступно: ${user.balance.toFixed(2)} USDT`);
    }

    const clientID = uuidv4();

    // Debit USDT from balance immediately
    user.balance -= usdtToDebit;
    await this.userRepository.save(user);

    try {
      const payoutResponse = await this.norosService.createPayout(
        fiatAmountToReceive, // Send the amount after fee deduction
        currency,
        number,
        bankname,
        owner,
        clientID, // Pass our internal ID as uid
        method, // Pass RUB payment method
      );

      const transaction = this.transactionRepository.create({
        user: { id: user.id } as User,
        type: 'withdraw',
        currency,
        amount: usdtToDebit, // USDT debited from balance
        address: number || 'FIAT_WITHDRAW', // Bank account/card number, fallback for fiat
        tracker_id: payoutResponse.id.toString(), // Store Noros payout ID
        client_transaction_id: clientID,
        status: 'pending', // Will be polled for updates
        payment_provider: 'noros',
        token: bankname,
        fiat_amount: fiatAmountToReceive, // Fiat amount user will receive
        rate: exchangeRate, // Exchange rate used
        extra: {
          bankName: bankname,
          recipientName: owner,
          rubMethod: method, // Store RUB payment method for future reference
          requestedFiatAmount: amount, // Store original requested amount
        },
      });

      const savedTransaction = await this.transactionRepository.save(
        transaction,
      );

      this.logger.log(
        `Noros fiat withdrawal initiated: payoutId: ${payoutResponse.id}, clientID: ${clientID}, currency: ${currency}, requested: ${amount}, sent: ${fiatAmountToReceive}`,
      );

      return {
        transaction: savedTransaction,
        payoutId: payoutResponse.id,
      };
    } catch (error) {
      // Refund balance on error
      user.balance += usdtToDebit;
      await this.userRepository.save(user);

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create Noros fiat withdrawal: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async processCallback(
    trackerId: string,
    clientTransactionIdFromCallback?: string,
    callbackData?: CallbackDto,
  ): Promise<void> {
    // DEBUG log removed

    let transactionData: TransactionStatusDto;

    // Если у нас есть данные из колбэка, используем их
    if (callbackData && callbackData.status) {
      // Маппинг статусов Alfabit на наши статусы
      let mappedStatus = 'pending';

      // Если есть сумма в amountInFact - это успешный депозит
      if (
        callbackData.amountInFact &&
        parseFloat(callbackData.amountInFact) > 0
      ) {
        mappedStatus = 'SUCCESS';
      } else if (
        callbackData.status === 'success' ||
        callbackData.status === 'completed' ||
        callbackData.status === 'SUCCESS'
      ) {
        mappedStatus = 'SUCCESS';
      } else if (
        callbackData.status === 'failed' ||
        callbackData.status === 'cancelled' ||
        callbackData.status === 'invoiceNotPayed' ||
        callbackData.status === 'ERROR'
      ) {
        mappedStatus = 'ERROR';
      }
      // Промежуточные статусы остаются pending только если нет суммы

      transactionData = {
        status: mappedStatus,
        amount: callbackData.amountInFact
          ? parseFloat(callbackData.amountInFact)
          : undefined,
        transactionHash: callbackData.txId,
        clientTransactionId: undefined,
        token: callbackData.currencyInCode || callbackData.currencyOutCode,
      };

      // DEBUG logs removed
    } else {
      // Fallback: получаем статус через API
      try {
        transactionData = await this.apiService.getTransactionStatus(trackerId);
        // DEBUG log removed
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to get transaction status for trackerId: ${trackerId}`,
          error instanceof Error ? error.stack : undefined,
          { error: message },
        );
        throw new BadRequestException(
          `Failed to get transaction status: ${message}`,
        );
      }
    }

    // Для Alfabit ищем транзакцию по tracker_id, так как clientTransactionId не возвращается
    // DEBUG log removed
    const transaction = await this.transactionRepository.findOne({
      where: { tracker_id: trackerId },
      relations: ['user'],
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction not found for trackerId: ${trackerId}. Checking if transaction exists with different criteria...`,
      );

      // Попробуем найти транзакцию по другим критериям для отладки

      // DEBUG log removed

      return;
    }

    if (transactionData.status === 'SUCCESS' && transactionData.amount) {
      // Проверяем, не обработали ли мы уже эту транзакцию
      if (transaction.status === 'complete') {
        this.logger.warn(
          `Transaction ${trackerId} already processed as complete, skipping duplicate processing`,
        );
        return;
      }

      transaction.status = 'complete';
      transaction.amount = transactionData.amount;
      transaction.transaction_hash = transactionData.transactionHash;

      const user = await this.userRepository.findOne({
        where: { id: transaction.user.id },
      });
      if (user) {
        if (transaction.type === 'deposit') {
          // Конвертируем валюту в USDT по курсу
          const currencyRate = await this.apiService.getCurrencyRate(
            transaction.currency,
          );
          const convertedAmount = transactionData.amount * currencyRate;

          this.logger.log(
            `Deposit conversion: ${transactionData.amount} ${transaction.currency} * ${currencyRate} = ${convertedAmount} USDT`,
          );

          user.balance += convertedAmount;
          user.totalDeposit += convertedAmount;
          await this.userRepository.save(user);

          // Отправляем уведомление в Telegram о пополнении баланса
          try {
            const message =
              `💰 *Баланс пополнен!*\n\n` +
              `💵 *Сумма:* ${convertedAmount.toFixed(2)} USDT\n` +
              `💳 *Новый баланс:* ${user.balance.toFixed(2)} USDT\n` +
              `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n` +
              `Спасибо за пополнение!`;

            await this.telegramService.sendMessage(user.telegramId, message);
            this.logger.log(
              `Telegram notification sent for deposit to user ${user.telegramId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send Telegram notification for deposit to user ${user.telegramId}:`,
              error,
            );
            // Не прерываем процесс из-за ошибки уведомления
          }

          try {
            // Отправляем уведомление через WebSocket
            void this.transactionGateway.notifyTransactionConfirmed(
              user.telegramId,
              user.balance,
              convertedAmount, // Используем конвертированную сумму
              'USDT', // Всегда показываем в USDT
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `Failed to notify user ${user.telegramId} via WebSocket`,
              error instanceof Error ? error.stack : undefined,
              { error: message },
            );
          }

          if (user.referrer && transactionData.amount >= 100) {
            const referrer = await this.userRepository.findOne({
              where: { id: user.referrer.id },
              relations: ['referrals'],
            });
            if (referrer) {
              const referralCount = referrer.referrals.length;
              let refBonus = 0;
              if (referralCount >= 1 && referralCount <= 10) refBonus = 3;
              else if (referralCount >= 11 && referralCount <= 30) refBonus = 5;
              else if (referralCount >= 31 && referralCount <= 100)
                refBonus = 8;
              else if (referralCount > 100) refBonus = 10;

              const bonusAmount =
                ((this.convertTonToUsdt(transaction, transactionData.amount) -
                  100) *
                  refBonus) /
                100;
              if (bonusAmount > 0) {
                referrer.refBalance += bonusAmount;
                await this.userRepository.save(referrer);

                if (referrer.refBalance >= 10) {
                  referrer.balance += referrer.refBalance;
                  this.logger.log(
                    `RefBalance reset for ${referrer.id}: added ${referrer.refBalance} to balance`,
                  );
                  referrer.refBalance = 0;
                  await this.userRepository.save(referrer);
                }
              }
            }
          }
        }
      }
    } else if (transactionData.status === 'ERROR') {
      // Проверяем, не обработали ли мы уже эту транзакцию как ошибку
      if (transaction.status === 'failed') {
        this.logger.warn(
          `Transaction ${trackerId} already processed as failed, skipping duplicate processing`,
        );
        return;
      }

      transaction.status = 'failed';
      if (transaction.type === 'withdraw') {
        const user = await this.userRepository.findOne({
          where: { id: transaction.user.id },
        });
        if (user) {
          user.balance += transaction.amount;
          await this.userRepository.save(user);
          this.logger.log(
            `Refunded ${transaction.amount} to user ${user.id} due to failed withdraw`,
          );
        }
      }
    } else if (transactionData.status === 'pending') {
      // Промежуточный статус - это нормально, не логируем предупреждение
      // DEBUG log removed
    } else {
      this.logger.warn(
        `Unexpected transaction status: ${transactionData.status} for trackerId: ${trackerId}`,
      );
    }

    await this.transactionRepository.save(transaction);
    this.logger.log(
      `Callback processed: trackerId: ${trackerId}, status: ${transactionData.status}`,
    );
  }

  async processNorosTransactionStatus(clientID: string): Promise<void> {
    this.logger.log(
      `Processing fiat callback for clientID: ${clientID}`,
    );

    try {
      // First, find the transaction to get the currency
      const transaction = await this.transactionRepository.findOne({
        where: { client_transaction_id: clientID },
        relations: ['user'],
      });

      if (!transaction) {
        this.logger.warn(
          `Transaction not found for clientID: ${clientID}`,
        );
        return;
      }

      // The tracker_id from the database should be the Noros transaction ID.
      // Noros API expects a number, so we parse it.
      const norosTransId = parseInt(transaction.tracker_id, 10);
      if (isNaN(norosTransId)) {
        this.logger.error(`Invalid Noros transaction ID found in tracker_id: ${transaction.tracker_id}`);
        // Mark as failed to avoid retrying indefinitely
        transaction.status = 'failed';
        await this.transactionRepository.save(transaction);
        return;
      }

      // Extract RUB method from transaction extra if available
      const rubMethod = transaction.extra?.rubMethod as RubPaymentMethod | undefined;

      // Use different endpoints for deposits and withdrawals
      let statusData: any;
      if (transaction.type === 'withdraw') {
        // For withdrawals, use payout endpoint with api_secret_key
        const payoutStatus = await this.norosService.getPayoutStatus(
          norosTransId,
          transaction.currency,
          rubMethod,
        );
        // Map payout status to transaction status format
        statusData = {
          status: payoutStatus.status.toLowerCase(), // 'Success' -> 'success', 'Pending' -> 'pending'
          amount: payoutStatus.amount,
        };
      } else {
        // For deposits, use transaction endpoint with api_key
        statusData = await this.norosService.getTransactionStatus(
          norosTransId,
          transaction.currency,
          rubMethod,
          transaction.fiat_amount || undefined,
        );
      }

      if (statusData.status === 'success' || statusData.status === 'completed') {
        if (transaction.status === 'complete') {
          this.logger.warn(
            `Transaction ${clientID} already processed as complete, skipping duplicate processing`,
          );
          return;
        }

        transaction.status = 'complete';

        const user = await this.userRepository.findOne({
          where: { id: transaction.user.id },
        });

        if (user) {
          if (transaction.type === 'deposit') {
            const currencyRate = await this.apiService.getCurrencyRate(transaction.currency);
            let convertedAmount: number;

            // New logic: use baseFiatAmount if available
            const baseFiatAmount = transaction.extra?.baseFiatAmount as number | undefined;

            if (baseFiatAmount) {
              // Calculate USDT based on the original amount requested by the user
              convertedAmount = baseFiatAmount * currencyRate;
              this.logger.log(
                `Fiat deposit (new): crediting user with USDT equivalent of base amount. Base: ${baseFiatAmount} ${transaction.currency}, Rate: ${currencyRate}, Amount: ${convertedAmount.toFixed(2)} USDT`,
              );
            } else {
              // Fallback for old transactions: deduct fee from the paid amount
              this.logger.warn(`Transaction ${transaction.id} is missing 'baseFiatAmount'. Using fallback fee calculation.`);
              const feePercentage = this.getFeePercentage(transaction.type, transaction.currency, rubMethod, statusData.amount);
              const convertedAmountBeforeFee = statusData.amount * currencyRate;
              // This is an approximation of the base amount
              convertedAmount = convertedAmountBeforeFee * (1 - feePercentage); 
              this.logger.log(
                `Fiat deposit (fallback): ${statusData.amount} ${transaction.currency} * ${currencyRate} = ${convertedAmountBeforeFee.toFixed(2)} USDT, after ~${(feePercentage * 100).toFixed(1)}% fee: ${convertedAmount.toFixed(2)} USDT`,
              );
            }

            transaction.amount = convertedAmount;
            transaction.rate = currencyRate;

            user.balance += convertedAmount;
            user.totalDeposit += convertedAmount;
            await this.userRepository.save(user);

            try {
              const message =
                `💰 *Баланс пополнен!*\n\n` +
                `💵 *Сумма:* ${(transaction.fiat_amount ?? 0).toFixed(2)} ${transaction.currency}\n` +
                `💲 *В USDT:* ${convertedAmount.toFixed(2)} USDT\n` +
                `💳 *Новый баланс:* ${user.balance.toFixed(2)} USDT\n` +
                `💳 *Способ оплаты:* ${transaction.token}\n` +
                `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n` +
                `Спасибо за пополнение!`;

              await this.telegramService.sendMessage(user.telegramId, message);
              this.logger.log(
                `Telegram notification sent for fiat deposit to user ${user.telegramId}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to send Telegram notification for fiat deposit to user ${user.telegramId}:`,
                error,
              );
            }

            try {
              void this.transactionGateway.notifyTransactionConfirmed(
                user.telegramId,
                user.balance,
                convertedAmount,
                'USDT',
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              this.logger.error(
                `Failed to notify user ${user.telegramId} via WebSocket`,
                error instanceof Error ? error.stack : undefined,
                { error: message },
              );
            }

            // Referral logic remains the same
            if (user.referrer && convertedAmount >= 100) {
              const referrer = await this.userRepository.findOne({
                where: { id: user.referrer.id },
                relations: ['referrals'],
              });
              if (referrer) {
                const referralCount = referrer.referrals.length;
                let refBonus = 0;
                if (referralCount >= 1 && referralCount <= 10) refBonus = 3;
                else if (referralCount >= 11 && referralCount <= 30)
                  refBonus = 5;
                else if (referralCount >= 31 && referralCount <= 100)
                  refBonus = 8;
                else if (referralCount > 100) refBonus = 10;

                const bonusAmount =
                  ((convertedAmount - 100) * refBonus) /
                  100;
                if (bonusAmount > 0) {
                  referrer.refBalance += bonusAmount;
                  await this.userRepository.save(referrer);

                  if (referrer.refBalance >= 10) {
                    referrer.balance += referrer.refBalance;
                    this.logger.log(
                      `RefBalance reset for ${referrer.id}: added ${referrer.refBalance} to balance`,
                    );
                    referrer.refBalance = 0;
                    await this.userRepository.save(referrer);
                  }
                }
              }
            }
          } else if (transaction.type === 'withdraw') {
            // This part of logic will be triggered by a separate cron for withdrawals
            this.logger.log(`Fiat withdrawal completed: ${transaction.amount} USDT`);
            try {
              const message =
                `✅ *Вывод средств выполнен!*\n\n` +
                `💵 *Сумма:* ${(transaction.fiat_amount ?? 0).toFixed(2)} ${transaction.currency}\n` +
                `💲 *Списано USDT:* ${transaction.amount.toFixed(2)} USDT\n` +
                `💳 *Способ вывода:* ${transaction.token}\n` +
                `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n` +
                `Средства отправлены на указанные реквизиты.`;

              await this.telegramService.sendMessage(user.telegramId, message);
              this.logger.log(
                `Telegram notification sent for fiat withdrawal to user ${user.telegramId}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to send Telegram notification for fiat withdrawal to user ${user.telegramId}:`,
                error,
              );
            }
          }
        }
      } else if (['error', 'cancelled', 'canceled'].includes(statusData.status)) {
        if (transaction.status === 'failed') {
          this.logger.warn(
            `Transaction ${clientID} already processed as failed, skipping duplicate processing`,
          );
          return;
        }

        transaction.status = 'failed';

        // If it's a withdrawal, refund the balance
        if (transaction.type === 'withdraw') {
          const user = await this.userRepository.findOne({
            where: { id: transaction.user.id },
          });
          if (user) {
            user.balance += transaction.amount;
            await this.userRepository.save(user);
            this.logger.log(
              `Refunded ${transaction.amount} USDT to user ${user.id} due to failed fiat withdrawal`,
            );
          }
        }
      } else if (['created', 'pending', 'accepted'].includes(statusData.status)) {
        this.logger.log(
          `Transaction ${clientID} is still pending (status: ${statusData.status})`,
        );
      } else {
        this.logger.warn(
          `Unexpected transaction status: ${statusData.status} for clientID: ${clientID}`,
        );
      }

      await this.transactionRepository.save(transaction);
      this.logger.log(
        `Fiat callback processed: clientID: ${clientID}, status: ${statusData.status}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process fiat callback for clientID: ${clientID}`,
        error instanceof Error ? error.stack : undefined,
        { error: message },
      );
      throw error;
    }
  }

  async getTransactionHistory(telegramId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { user: { telegramId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getFiatTransactionHistory(telegramId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        user: { telegramId },
        payment_provider: 'noros',
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getCryptoTransactionHistory(telegramId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        user: { telegramId },
        payment_provider: 'alfabit',
      },
      order: { createdAt: 'DESC' },
    });
  }

  async addToCallbackQueue(
    trackerId: string,
    clientTransactionId?: string,
    callbackData?: CallbackDto,
  ): Promise<void> {
    try {
      await this.callbackQueue.add(
        'process-callback',
        { trackerId, clientTransactionId, callbackData },
        {
          attempts: 3,
          backoff: 5000,
          delay: 2000, // Уменьшаем задержку до 2 секунд
          jobId: `callback-${trackerId}`, // Уникальный ID для дедупликации
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(
        `Added to callback queue: trackerId: ${trackerId}, clientTransactionId: ${clientTransactionId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to add to callback queue for trackerId: ${trackerId}`,
        error instanceof Error ? error.stack : undefined,
        { error: message },
      );
      throw error;
    }
  }

  private convertTonToUsdt(transaction: Transaction, amount: number): number {
    if (transaction.currency === 'TON') {
      return amount * this.TON_TO_USDT_RATE;
    }
    return amount;
  }

  async getMerchantBalances(): Promise<
    {
      assetCode: string;
      currencyCode: string;
      balance: string;
      balanceUsd: string;
    }[]
  > {
    // DEBUG log removed
    return await this.apiService.getMerchantBalances();
  }

  async confirmFiatPayment(norosId: string): Promise<void> {
    this.logger.log(`User confirmed fiat payment for norosId: ${norosId}`);

    const transaction = await this.transactionRepository.findOne({
      where: { tracker_id: norosId },
    });

    if (!transaction) {
      this.logger.error(`Transaction with norosId (tracker_id) ${norosId} not found.`);
      throw new BadRequestException('Transaction not found.');
    }

    if (!transaction.client_transaction_id) {
      this.logger.error(`Transaction ${norosId} has no client_transaction_id`);
      throw new BadRequestException('Invalid transaction state.');
    }

    // User has confirmed payment on their end.
    // Immediately check the transaction status from Noros instead of waiting for the cron job.
    this.logger.log(`User confirmed payment for transaction ${norosId}. Triggering immediate status check...`);

    try {
      await this.processNorosTransactionStatus(transaction.client_transaction_id);
      this.logger.log(`Immediate status check completed for transaction ${norosId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check transaction status immediately: ${message}`);
      // Don't throw - the cron job will handle it eventually
      // But log the error so we know something went wrong
    }
  }
}
