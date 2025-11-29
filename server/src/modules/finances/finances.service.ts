import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entities/transactions.entity';
import { User } from '../../entities/user.entity';
import { ApiService } from '../../services/api.service';
import { TransactionGateway } from './transactions.gateway';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TransactionStatusDto } from './dto/transaction-status.dto';
import { TelegramService } from '../../services/telegram.service';
import { CallbackDto } from './dto/callback.dto';

@Injectable()
export class FinancesService {
  private readonly logger = new Logger(FinancesService.name);
  private readonly TON_TO_USDT_RATE = 3;
  private readonly supportedCurrencies = ['USDTTON', 'TON'];

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private apiService: ApiService,
    private transactionGateway: TransactionGateway,
    @InjectQueue('callback-queue') private callbackQueue: Queue,
    private telegramService: TelegramService,
  ) {
    this.logger.log('FinancesService initialized');
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

  async getTransactionHistory(telegramId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { user: { telegramId } },
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
}
