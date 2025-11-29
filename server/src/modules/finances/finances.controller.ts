import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FinancesService } from './finances.service';
import { Logger } from '@nestjs/common';
import { CallbackDto } from './dto/callback.dto';

@Controller('finances')
export class FinancesController {
  private readonly logger = new Logger(FinancesController.name);
  constructor(private financesService: FinancesService) {}

  @Post('transaction')
  async createTransaction(
    @Body()
    body: {
      telegramId: string;
      currency: string;
      type: 'deposit' | 'withdraw';
      amount?: number;
      receiver?: string;
      destTag?: string;
    },
  ) {
    // DEBUG log removed

    // Валидация telegramId
    if (
      !body.telegramId ||
      typeof body.telegramId !== 'string' ||
      body.telegramId.trim() === ''
    ) {
      this.logger.error(`Invalid or missing telegramId: ${body.telegramId}`);
      throw new BadRequestException(
        'telegramId is required and must be a non-empty string',
      );
    }

    // Валидация currency
    if (
      !body.currency ||
      typeof body.currency !== 'string' ||
      body.currency.trim() === ''
    ) {
      this.logger.error(`Invalid or missing currency: ${body.currency}`);
      throw new BadRequestException(
        'currency is required and must be a non-empty string',
      );
    }

    // Валидация type
    if (!['deposit', 'withdraw'].includes(body.type)) {
      this.logger.error(`Invalid transaction type: ${body.type}`);
      throw new BadRequestException(
        'type must be either "deposit" or "withdraw"',
      );
    }

    const transaction = await this.financesService.initTransaction(
      body.telegramId,
      body.currency,
      body.type,
      body.amount,
      body.receiver,
      body.destTag,
    );
    this.logger.log(`Transaction created: ${JSON.stringify(transaction)}`);
    return {
      address: transaction.address,
      trackerId: transaction.tracker_id,
    };
  }

  @Post('callback')
  async handleCallback(@Body() body: CallbackDto) {
    // DEBUG log removed

    // Поддержка как старого формата (tracker_id), так и нового (uid)
    const trackerId = body.tracker_id || body.uid;

    if (!trackerId) {
      this.logger.error('tracker_id or uid is required in callback');
      throw new BadRequestException('tracker_id or uid is required');
    }

    await this.financesService.addToCallbackQueue(
      trackerId,
      body.client_transaction_id,
      body, // Передаем весь объект колбэка
    );
    return { status: 'accepted' };
  }

  @Get('history/:userId')
  async getTransactionHistory(@Param('userId') userId: string) {
    const transactions =
      await this.financesService.getTransactionHistory(userId);
    return transactions.map((t) => ({
      type: t.type,
      currency: t.currency,
      amount: t.amount,
      status:
        t.status === 'failed'
          ? 'canceled'
          : t.status === 'complete'
            ? 'confirmed'
            : t.status,
      tracker_id: t.tracker_id,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  @Get('merchant-balances')
  async getMerchantBalances() {
    // DEBUG log removed
    const balances = await this.financesService.getMerchantBalances();
    return balances;
  }
}
