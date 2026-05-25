import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  Query,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinancesService } from './finances.service';
import { Logger } from '@nestjs/common';
import { CallbackDto } from './dto/callback.dto';
import { GetBanksDto } from './dto/get-banks.dto';
import { RubPaymentMethod } from '../../services/noros.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    telegramId: string;
  };
}

@Controller('finances')
export class FinancesController {
  private readonly logger = new Logger(FinancesController.name);
  constructor(private financesService: FinancesService) { }

  @UseGuards(JwtAuthGuard)
  @Post('transaction')
  async createTransaction(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      currency: string;
      type: 'deposit' | 'withdraw';
      amount?: number;
      receiver?: string;
      destTag?: string;
    },
  ) {
    const telegramId = req.user.telegramId;

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
      telegramId,
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

  @Get('history/all/:userId')
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
      fiat_amount: t.fiat_amount,
    }));
  }

  @Get('history/fiat/:userId')
  async getFiatTransactionHistory(@Param('userId') userId: string) {
    const transactions =
      await this.financesService.getFiatTransactionHistory(userId);
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
      fiat_amount: t.fiat_amount,
    }));
  }

  @Get('history/crypto/:userId')
  async getCryptoTransactionHistory(@Param('userId') userId: string) {
    const transactions =
      await this.financesService.getCryptoTransactionHistory(userId);
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
      fiat_amount: t.fiat_amount,
    }));
  }

  @Get('merchant-balances')
  async getMerchantBalances() {
    // DEBUG log removed
    const balances = await this.financesService.getMerchantBalances();
    return balances;
  }

  @Get('fiat/banks')
  async getBanks(@Query() getBanksDto: GetBanksDto) {
    this.logger.log(`Request to get banks for currency: ${getBanksDto.currency}, amount: ${getBanksDto.amount}, method: ${getBanksDto.method}`);
    return this.financesService.getBanks(getBanksDto.currency, getBanksDto.amount, getBanksDto.method);
  }

  @Get('fiat/rates')
  async getFiatRates() {
    this.logger.log(`Request to get fiat rates`);
    return this.financesService.getFiatRates();
  }

  @UseGuards(JwtAuthGuard)
  @Post('fiat/transaction')
  async createFiatTransaction(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      amount: number;
      bankId: number;
      currency: string;
      userInfo?: {
        ip?: string;
        ua?: string;
        email?: string;
        id?: string;
        fio?: string;
        card?: string;
      };
      method?: RubPaymentMethod;
    },
  ) {
    const telegramId = req.user.telegramId;
    this.logger.log(
      `[FIAT_TX] Request to create fiat transaction for telegramId: ${telegramId}, amount: ${body.amount}, currency: ${body.currency}, bankId: ${body.bankId}`,
    );

    if (!body.amount || body.amount <= 0) {
      this.logger.error(`Invalid amount: ${body.amount}`);
      throw new BadRequestException('amount must be greater than 0');
    }

    if (!body.bankId || typeof body.bankId !== 'number') {
      this.logger.error(`Invalid or missing bankId: ${body.bankId}`);
      throw new BadRequestException(
        'bankId is required and must be a number',
      );
    }

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

    const result = await this.financesService.initFiatTransaction(
      telegramId,
      body.amount,
      body.bankId,
      body.currency,
      body.userInfo,
      body.method,
    );

    this.logger.log(
      `Noros fiat transaction created: norosId=${result.transaction.tracker_id}, clientID=${result.transaction.client_transaction_id}`,
    );

    // Return the new response structure from the service
    return {
      norosId: result.transaction.tracker_id,
      clientID: result.transaction.client_transaction_id,
      receiver: result.receiver,
      bankName: result.bankName,
      recipientName: result.recipientName,
      manual: result.manual,
      exchangeRate: result.exchangeRate,
      estimatedUSDT: result.estimatedUSDT,
      fiatAmountToPay: result.fiatAmountToPay,
    };
  }



  @UseGuards(JwtAuthGuard)
  @Post('fiat/withdraw')
  async createFiatWithdraw(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      amount: number;
      currency: string;
      number: string; // card/account number
      bankname: string;
      owner: string; // recipient name
      method?: RubPaymentMethod;
    },
  ) {
    const telegramId = req.user.telegramId;
    // A series of validation checks for the request body
    if (!body.amount || body.amount <= 0) {
      this.logger.error(`Invalid amount: ${body.amount}`);
      throw new BadRequestException('amount must be greater than 0');
    }
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
    if (
      !body.number ||
      typeof body.number !== 'string' ||
      body.number.trim() === ''
    ) {
      this.logger.error(`Invalid or missing number: ${body.number}`);
      throw new BadRequestException(
        'number is required and must be a non-empty string',
      );
    }
    if (
      !body.bankname ||
      typeof body.bankname !== 'string' ||
      body.bankname.trim() === ''
    ) {
      this.logger.error(`Invalid or missing bankname: ${body.bankname}`);
      throw new BadRequestException(
        'bankname is required and must be a non-empty string',
      );
    }
    if (
      !body.owner ||
      typeof body.owner !== 'string' ||
      body.owner.trim() === ''
    ) {
      this.logger.error(`Invalid or missing owner: ${body.owner}`);
      throw new BadRequestException(
        'owner is required and must be a non-empty string',
      );
    }

    const result = await this.financesService.initFiatWithdraw(
      telegramId,
      body.amount,
      body.currency,
      body.number,
      body.bankname,
      body.owner,
      body.method,
    );

    this.logger.log(
      `Noros fiat withdraw created: payoutId=${result.payoutId}, clientID=${result.transaction.client_transaction_id}`,
    );

    return {
      payoutId: result.payoutId,
      clientID: result.transaction.client_transaction_id,
      status: 'pending',
    };
  }

  @Patch('fiat/transaction/:norosId/proof')
  async confirmFiatTransactionProof(@Param('norosId') norosId: string) {
    this.logger.log(`Request to confirm fiat transaction proof for norosId: ${norosId}`);
    await this.financesService.confirmFiatPayment(norosId);
    return { status: 'ok' };
  }

  @Get('system-wallet')
  async getSystemWallet() {
    const wallet = await this.financesService.getSystemWallet();
    return { balance: wallet.balance };
  }

  @UseGuards(JwtAuthGuard)
  @Post('system-wallet/withdraw')
  async withdrawFromSystemWallet(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      amount: number;
      currency: string;
      number: string;
      bankname: string;
      owner: string;
      method?: RubPaymentMethod;
    },
  ) {
    const telegramId = req.user.telegramId;
    if (!body.amount || body.amount <= 0) throw new BadRequestException('amount must be > 0');
    if (!body.currency) throw new BadRequestException('currency is required');
    if (!body.number) throw new BadRequestException('number is required');
    if (!body.bankname) throw new BadRequestException('bankname is required');
    if (!body.owner) throw new BadRequestException('owner is required');

    const result = await this.financesService.initSystemWalletWithdraw(
      telegramId,
      body.amount,
      body.currency,
      body.number,
      body.bankname,
      body.owner,
      body.method,
    );

    return {
      payoutId: result.payoutId,
      clientID: result.transaction.client_transaction_id,
      status: 'pending',
    };
  }

  @Post('system-wallet/reset')
  async resetSystemWallet() {
    await this.financesService.resetSystemWallet();
    return { status: 'ok', message: 'System wallet balance reset to 0' };
  }
}
