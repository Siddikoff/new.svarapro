import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Alfabit API Response Interfaces
interface AlfabitApiResponse<T> {
  message: string;
  data: T;
}

interface AlfabitInvoiceData {
  uid: string;
  requisites: string;
  requisitesMemoTag?: string | null;
  requisitesQrCode?: string | null;
}

interface AlfabitWithdrawData {
  uid: string;
}

interface AlfabitOrderStatusData {
  amountInFact?: string;
  status: string;
  txId?: string;
  currencyInCode?: string;
  currencyOutCode?: string;
}

interface AlfabitCurrency {
  assetCode: string;
  usdPrice: string;
  assetName: string;
}

interface AlfabitWithdrawFee {
  toAssetCode: string;
  toCurrencyCode: string;
  toCurrencyName: string;
  fixFee: number;
  rate: number;
  isTurnRate: boolean;
  minOut: number;
  maxOut: number;
}

interface AlfabitBalance {
  assetCode: string;
  currencyCode: string;
  balance: string;
  balanceUsd: string;
}

@Injectable()
export class ApiService {
  // Старый эквайринг Exnode (закомментирован для возможности восстановления)
  // private readonly baseUrl = 'https://my.exnode.io';
  // private readonly apiPublic = process.env.EXNODE_API_PUBLIC;

  // Новый эквайринг Alfabit
  private readonly baseUrl =
    process.env.ALFABIT_BASE_URL || 'https://pay.alfabit.org';
  private readonly apiKey = process.env.ALFABIT_API_KEY;
  private readonly callBackUrl =
    'https://svarapro.com/api/v1/finances/callback';
  private readonly supportedTokens = ['USDTTON', 'TON'];
  private readonly logger = new Logger(ApiService.name);

  constructor() {
    if (!this.apiKey) {
      throw new BadRequestException(
        'ALFABIT_API_KEY is not defined in environment variables',
      );
    }
    axiosRetry(axios, {
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000,
    });
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      throw new BadRequestException('ALFABIT_API_KEY is not defined');
    }
    return this.apiKey;
  }

  // Старые методы для совместимости с закомментированным кодом Exnode
  private getApiSecret(): string {
    const secret = process.env.EXNODE_API_SECRET;
    if (!secret) {
      throw new BadRequestException('EXNODE_API_SECRET is not defined');
    }
    return secret;
  }

  private get apiPublic(): string | undefined {
    return process.env.EXNODE_API_PUBLIC;
  }

  async createDepositAddress(
    token: string,
    clientTransactionId: string,
  ): Promise<{
    address: string;
    trackerId: string;
    destTag?: string | null;
    qrCodeUrl?: string | null;
  }> {
    if (!this.supportedTokens.includes(token)) {
      this.logger.error(`Unsupported token: ${token}`);
      throw new BadRequestException(`Unsupported token: ${token}`);
    }
    if (
      !clientTransactionId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    ) {
      this.logger.error(`Invalid clientTransactionId: ${clientTransactionId}`);
      throw new BadRequestException(
        `Invalid clientTransactionId: ${clientTransactionId}`,
      );
    }

    // Старый эквайринг Exnode (закомментирован для возможности восстановления)
    /*
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      token,
      client_transaction_id: clientTransactionId,
      address_type: 'SINGLE',
      call_back_url: this.callBackUrl,
    });

    const signature = createHmac('sha512', this.getApiSecret())
      .update(timestamp + body)
      .digest('hex');

    // DEBUG logs removed

    try {
      const response = await axios.post<ExnodeCreateTransactionResponse>(
        `${this.baseUrl}/api/transaction/create/in`,
        body,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ApiPublic: this.apiPublic!,
            Signature: signature,
            Timestamp: timestamp,
          },
          timeout: 10000,
        },
      );

      if (response.data.status !== 'ACCEPTED') {
        this.logger.error(
          `Failed to create deposit address: ${response.data.status}, response: ${JSON.stringify(response.data)}`,
        );
        throw new BadRequestException(
          `Failed to create deposit address: ${response.data.status}`,
        );
      }

      this.logger.log(
        `Deposit address created: ${response.data.refer}, trackerId: ${response.data.tracker_id}`,
      );
      return {
        address: response.data.refer!,
        trackerId: response.data.tracker_id,
        destTag: response.data.dest_tag || null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Exnode API error (createDepositAddress): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Exnode API error: ${error.message}`);
      } else {
        this.logger.error(
          `Exnode API error (createDepositAddress): ${String(error)}`,
        );
        throw new BadRequestException(`Exnode API error: ${String(error)}`);
      }
    }
    */

    // Новый эквайринг Alfabit - создание инвойса без суммы
    const requestBody = {
      currencyInCode: token, // Оставляем оригинальный токен: USDTTON остается USDTTON
      invoiceAssetCode: 'USDT',
      comment: `Deposit for transaction ${clientTransactionId}`,
      publicComment: `Deposit ${clientTransactionId}`,
      callbackUrl: this.callBackUrl,
      isAwaitRequisites: true,
      expiryDurationMinutes: 60,
      isBayerPaysService: false,
    };

    // DEBUG logs removed

    try {
      // DEBUG logs removed

      const response = await axios.post<AlfabitApiResponse<AlfabitInvoiceData>>(
        `${this.baseUrl}/api/v1/integration/orders/invoice/without-amount`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.getApiKey(),
          },
          timeout: 10000,
        },
      );

      if (response.data.message !== 'ok') {
        this.logger.error(
          `Failed to create deposit invoice: ${response.data.message}`,
        );
        throw new BadRequestException(
          `Failed to create deposit invoice: ${response.data.message}`,
        );
      }

      const invoiceData = response.data.data;
      this.logger.log(
        `Deposit invoice created: uid: ${invoiceData.uid}, requisites: ${invoiceData.requisites}`,
      );

      return {
        address: invoiceData.requisites,
        trackerId: invoiceData.uid,
        destTag: invoiceData.requisitesMemoTag || null,
        qrCodeUrl: invoiceData.requisitesQrCode || null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (createDepositAddress): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (createDepositAddress): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }

  async createWithdrawAddress(
    token: string,
    clientTransactionId: string,
    amount: number,
    receiver: string,
    destTag?: string,
  ): Promise<{ trackerId: string }> {
    if (!this.supportedTokens.includes(token)) {
      this.logger.error(`Unsupported token: ${token}`);
      throw new BadRequestException(`Unsupported token: ${token}`);
    }
    if (
      !clientTransactionId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    ) {
      this.logger.error(`Invalid clientTransactionId: ${clientTransactionId}`);
      throw new BadRequestException(
        `Invalid clientTransactionId: ${clientTransactionId}`,
      );
    }
    if (amount <= 0) {
      this.logger.error(`Amount must be greater than 0: ${amount}`);
      throw new BadRequestException(`Amount must be greater than 0: ${amount}`);
    }
    if (!receiver || typeof receiver !== 'string' || receiver.trim() === '') {
      this.logger.error(`Invalid receiver address: ${receiver}`);
      throw new BadRequestException(`Invalid receiver address: ${receiver}`);
    }

    // Старый эквайринг Exnode (закомментирован для возможности восстановления)
    /*
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      token,
      client_transaction_id: clientTransactionId,
      amount,
      receiver,
      call_back_url: this.callBackUrl,
      ...(destTag && { dest_tag: destTag }),
      fiat_calculation: false,
    });

    const signature = createHmac('sha512', this.getApiSecret())
      .update(timestamp + body)
      .digest('hex');

    // DEBUG logs removed

    try {
      const response = await axios.post<ExnodeCreateTransactionResponse>(
        `${this.baseUrl}/api/transaction/create/out`,
        body,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ApiPublic: this.apiPublic!,
            Signature: signature,
            Timestamp: timestamp,
          },
          timeout: 10000,
        },
      );

      if (response.data.status !== 'ACCEPTED') {
        this.logger.error(
          `Failed to create withdraw transaction: ${response.data.status}, response: ${JSON.stringify(response.data)}`,
        );
        throw new BadRequestException(
          `Failed to create withdraw transaction: ${response.data.status}`,
        );
      }

      this.logger.log(
        `Withdraw transaction created: trackerId: ${response.data.tracker_id}`,
      );
      return {
        trackerId: response.data.tracker_id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Exnode API error (createWithdrawAddress): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Exnode API error: ${error.message}`);
      } else {
        this.logger.error(
          `Exnode API error (createWithdrawAddress): ${String(error)}`,
        );
        throw new BadRequestException(`Exnode API error: ${String(error)}`);
      }
    }
    */

    // Новый эквайринг Alfabit - создание вывода
    const requestBody = {
      amount: amount.toString(),
      toCurrencyCode: token, // Используем оригинальный токен
      recipient: receiver,
      ...(destTag && { requisitesMemoTag: destTag }),
      callbackUrl: this.callBackUrl,
      comment: `Withdraw for transaction ${clientTransactionId}`,
    };

    // DEBUG logs removed

    try {
      // DEBUG logs removed

      const response = await axios.post<
        AlfabitApiResponse<AlfabitWithdrawData>
      >(`${this.baseUrl}/api/v1/integration/orders/withdraw`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getApiKey(),
        },
        timeout: 10000,
      });

      if (response.data.message !== 'ok') {
        this.logger.error(
          `Failed to create withdraw transaction: ${response.data.message}`,
        );
        throw new BadRequestException(
          `Failed to create withdraw transaction: ${response.data.message}`,
        );
      }

      const withdrawData = response.data.data;
      this.logger.log(`Withdraw transaction created: uid: ${withdrawData.uid}`);

      return {
        trackerId: withdrawData.uid,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (createWithdrawAddress): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (createWithdrawAddress): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }

  async getTransactionStatus(trackerId: string): Promise<{
    status: string;
    amount?: number;
    transactionHash?: string;
    clientTransactionId?: string;
    token?: string;
  }> {
    if (
      !trackerId ||
      typeof trackerId !== 'string' ||
      trackerId.trim() === ''
    ) {
      this.logger.error(`Invalid trackerId: ${trackerId}`);
      throw new BadRequestException(`Invalid trackerId: ${trackerId}`);
    }

    // DEBUG log removed

    try {
      const response = await axios.get<
        AlfabitApiResponse<AlfabitOrderStatusData>
      >(`${this.baseUrl}/api/v1/integration/orders/${trackerId}`, {
        headers: {
          'x-api-key': this.getApiKey(),
        },
        timeout: 10000,
      });

      if (response.data.message !== 'ok') {
        this.logger.error(
          `Failed to get transaction status: ${response.data.message}`,
        );
        throw new BadRequestException(
          `Failed to get transaction status: ${response.data.message}`,
        );
      }

      const orderData = response.data.data;

      // Маппинг статусов Alfabit на наши статусы
      let mappedStatus = 'pending';

      // Если есть сумма в amountInFact - это успешный депозит
      if (orderData.amountInFact && parseFloat(orderData.amountInFact) > 0) {
        mappedStatus = 'SUCCESS';
      } else if (
        orderData.status === 'paid' ||
        orderData.status === 'completed' ||
        orderData.status === 'success'
      ) {
        mappedStatus = 'SUCCESS';
      } else if (
        orderData.status === 'failed' ||
        orderData.status === 'cancelled' ||
        orderData.status === 'invoiceNotPayed'
      ) {
        mappedStatus = 'ERROR';
      }
      // Промежуточные статусы остаются pending только если нет суммы

      this.logger.log(
        `Transaction status retrieved: trackerId: ${trackerId}, status: ${mappedStatus}`,
      );

      return {
        status: mappedStatus,
        amount: orderData.amountInFact
          ? parseFloat(orderData.amountInFact)
          : undefined,
        transactionHash: orderData.txId,
        clientTransactionId: undefined, // Alfabit не возвращает clientTransactionId, поэтому оставляем undefined
        token: orderData.currencyInCode || orderData.currencyOutCode,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (getTransactionStatus): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (getTransactionStatus): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }

  async getCurrencies(): Promise<
    {
      assetCode: string;
      usdPrice: string;
      assetName: string;
    }[]
  > {
    // DEBUG log removed

    try {
      const response = await axios.get<AlfabitApiResponse<AlfabitCurrency[]>>(
        `${this.baseUrl}/api/v1/integration/assets/currencies`,
        {
          headers: {
            'x-api-key': this.getApiKey(),
          },
          timeout: 10000,
        },
      );

      if (response.data.message !== 'ok') {
        this.logger.error(`Failed to get currencies: ${response.data.message}`);
        throw new BadRequestException(
          `Failed to get currencies: ${response.data.message}`,
        );
      }

      const currencies = response.data.data;
      this.logger.log(`Retrieved ${currencies.length} currencies from Alfabit`);

      return currencies.map((currency) => ({
        assetCode: currency.assetCode,
        usdPrice: currency.usdPrice,
        assetName: currency.assetName,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (getCurrencies): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (getCurrencies): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }

  async getCurrencyRate(assetCode: string): Promise<number> {
    const currencies = await this.getCurrencies();
    const currency = currencies.find((c) => c.assetCode === assetCode);

    if (!currency) {
      this.logger.warn(`Currency ${assetCode} not found, using default rate`);
      return 1; // Fallback rate
    }

    const rate = parseFloat(currency.usdPrice);
    this.logger.log(`Currency rate for ${assetCode}: ${rate} USD`);
    return rate;
  }

  async getWithdrawFees(): Promise<
    {
      toAssetCode: string;
      toCurrencyCode: string;
      toCurrencyName: string;
      fixFee: number;
      rate: number;
      isTurnRate: boolean;
      minOut: number;
      maxOut: number;
    }[]
  > {
    // DEBUG log removed

    try {
      const response = await axios.get<
        AlfabitApiResponse<AlfabitWithdrawFee[]>
      >(`${this.baseUrl}/api/v1/integration/assets/withdraw-fee`, {
        headers: {
          'x-api-key': this.getApiKey(),
        },
        timeout: 10000,
      });

      if (response.data.message !== 'ok') {
        this.logger.error(
          `Failed to get withdraw fees: ${response.data.message}`,
        );
        throw new BadRequestException(
          `Failed to get withdraw fees: ${response.data.message}`,
        );
      }

      const fees = response.data.data;
      this.logger.log(`Retrieved ${fees.length} withdraw fees from Alfabit`);

      return fees;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (getWithdrawFees): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (getWithdrawFees): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }

  async getWithdrawFee(currencyCode: string): Promise<{
    fixFee: number;
    rate: number;
    minOut: number;
    maxOut: number;
  }> {
    const fees = await this.getWithdrawFees();
    const fee = fees.find((f) => f.toCurrencyCode === currencyCode);

    if (!fee) {
      this.logger.warn(
        `Withdraw fee for ${currencyCode} not found, using default`,
      );
      return {
        fixFee: 0,
        rate: 0,
        minOut: 0,
        maxOut: 1000000,
      };
    }

    this.logger.log(
      `Withdraw fee for ${currencyCode}: fixFee=${fee.fixFee}, rate=${fee.rate}%`,
    );
    return {
      fixFee: fee.fixFee,
      rate: fee.rate,
      minOut: fee.minOut,
      maxOut: fee.maxOut,
    };
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

    try {
      const response = await axios.get<AlfabitApiResponse<AlfabitBalance[]>>(
        `${this.baseUrl}/api/v1/integration/merchant/balances`,
        {
          headers: {
            'x-api-key': this.getApiKey(),
          },
          timeout: 10000,
        },
      );

      if (response.data.message !== 'ok') {
        this.logger.error(
          `Failed to get merchant balances: ${response.data.message}`,
        );
        throw new BadRequestException(
          `Failed to get merchant balances: ${response.data.message}`,
        );
      }

      const balances = response.data.data;
      this.logger.log(
        `Retrieved ${balances.length} merchant balances from Alfabit`,
      );

      return balances;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Alfabit API error (getMerchantBalances): ${error.message}, response: ${JSON.stringify(error.response?.data)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${error.message}`);
      } else {
        this.logger.error(
          `Alfabit API error (getMerchantBalances): ${String(error)}`,
        );
        throw new BadRequestException(`Alfabit API error: ${String(error)}`);
      }
    }
  }
}
