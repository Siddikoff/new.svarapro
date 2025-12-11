import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// RUB payment method types
export enum RubPaymentMethod {
  CLASSIC = 'CLASSIC',     // 5000-100000 RUB, fee 15%
  SMALL = '1_5K',          // 1000-4999 RUB, fee 16%
  ALFA = 'ALFA',           // 1000-100000 RUB, fee 12%, Alfa-Alfa internal
}

// Noros API Response Interfaces (based on docs/NOROS.md)
interface NorosErrorResponse {
  // Define what an error response looks like, if specified in docs
  // Placeholder:
  message: string;
}

interface NorosBank {
  id: number;
  name: string;
  logo: string;
}

interface NorosBalance {
  balance: number;
  frozenInPayouts: number;
  frozenInWithdrawals: number;
}

interface NorosTransactionResponse {
  id: number;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'success' | 'error' | 'cancelled'; // Assuming statuses
  card: string;
  cardOwner: string;
  bankReceiver: string;
  country: string;
  manual: string;
  amountOffer: number;
  createdAt: string;
  updatedAt: string;
  uid: string;
  orderId: string;
}

interface NorosPayoutResponse {
  id: number;
  amount: number;
  number: string;
  bankname: string;
  owner: string;
  status: 'Pending' | 'Success' | 'Error'; // Assuming statuses
  proof: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  closeDate: string;
  uid: string;
}

interface CurrencyCredentials {
  apiKey: string;
  apiSecretKey: string;
}

@Injectable()
export class NorosService {
  private readonly baseUrl: string;
  private readonly credentials: Map<string, Partial<CurrencyCredentials>> = new Map();
  private readonly logger = new Logger(NorosService.name);

  constructor() {
    this.baseUrl = process.env.NOROS_BASE_URL;
    if (!this.baseUrl) {
      throw new Error('NOROS_BASE_URL is not defined in environment variables.');
    }

    // Load RUB credentials with subtypes
    const rubSubtypes = ['CLASSIC', '1_5K', 'ALFA'];
    for (const subtype of rubSubtypes) {
      const apiKey = process.env[`NOROS_API_KEY_RUB_${subtype}`];
      const apiSecretKey = process.env[`NOROS_API_SECRET_KEY_RUB_${subtype}`];

      if (apiKey || apiSecretKey) {
        this.credentials.set(`RUB_${subtype}`, { apiKey, apiSecretKey });
        this.logger.log(`Loaded credentials for RUB_${subtype}`);
      } else {
        this.logger.warn(`No Noros credentials found for RUB_${subtype}`);
      }
    }

    // Load other currencies
    const currencies = ['UZS', 'KZT', 'KGS'];
    for (const currency of currencies) {
      const apiKey = process.env[`NOROS_API_KEY_${currency}`];
      const apiSecretKey = process.env[`NOROS_API_SECRET_KEY_${currency}`];

      if (apiKey || apiSecretKey) {
        this.credentials.set(currency, { apiKey, apiSecretKey });
      } else {
        this.logger.warn(`No Noros credentials found for currency: ${currency}`);
      }
    }

    if (this.credentials.size === 0) {
      throw new BadRequestException('No Noros credentials found in environment variables.');
    }

    this.logger.log(
      `NorosService initialized for: ${Array.from(this.credentials.keys()).join(', ')}`,
    );

    axiosRetry(axios, {
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000,
    });
  }

  /**
   * Select appropriate RUB variant based on amount and payment method
   */
  private selectRubVariant(amount: number, method?: RubPaymentMethod): string {
    // If method is explicitly specified, use it
    if (method) {
      const variant = `RUB_${method}`;
      if (!this.credentials.has(variant)) {
        throw new BadRequestException(`No credentials found for ${variant}`);
      }
      return variant;
    }

    // Auto-select based on amount
    if (amount >= 1000 && amount < 5000) {
      // Use 1-5k variant for small amounts
      if (this.credentials.has('RUB_1_5K')) {
        return 'RUB_1_5K';
      }
    } else if (amount >= 5000) {
      // Use classic variant for larger amounts
      if (this.credentials.has('RUB_CLASSIC')) {
        return 'RUB_CLASSIC';
      }
    }

    // Fallback: try to find any available RUB variant
    const availableVariants = ['RUB_CLASSIC', 'RUB_1_5K', 'RUB_ALFA'];
    for (const variant of availableVariants) {
      if (this.credentials.has(variant)) {
        this.logger.warn(`Using fallback variant ${variant} for amount ${amount}`);
        return variant;
      }
    }

    throw new BadRequestException(`No RUB credentials available for amount ${amount}`);
  }

  private getHeaders(currency: string, keyType: 'api_key' | 'api_secret_key') {
    const creds = this.credentials.get(currency);
    const key = keyType === 'api_key' ? creds?.apiKey : creds?.apiSecretKey;

    if (!key) {
      throw new BadRequestException(`No suitable API key found for ${currency} and operation type ${keyType}.`);
    }

    return {
      'Content-Type': 'application/json',
      [keyType]: key,
    };
  }
  
  // TODO: Implement formatErrorMessage method if needed

  async getBanks(currency: string, amount?: number, method?: RubPaymentMethod): Promise<NorosBank[]> {
    this.logger.log(`Fetching banks from Noros API for ${currency}`);

    try {
      let currencyKey = currency;

      // For RUB, select appropriate variant
      if (currency === 'RUB') {
        // If amount is provided, use it to select variant
        if (amount !== undefined) {
          currencyKey = this.selectRubVariant(amount, method);
        } else if (method) {
          // If only method is provided
          currencyKey = `RUB_${method}`;
        } else {
          // Default to CLASSIC if no amount or method specified
          currencyKey = this.credentials.has('RUB_CLASSIC') ? 'RUB_CLASSIC' :
                        this.credentials.has('RUB_1_5K') ? 'RUB_1_5K' : 'RUB_ALFA';
        }
        this.logger.log(`Selected RUB variant: ${currencyKey}`);
      }

      const response = await axios.get<NorosBank[]>(`${this.baseUrl}/banks`, {
        headers: this.getHeaders(currencyKey, 'api_key'),
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch banks: ${error.message}`);
      throw new BadRequestException('Could not fetch bank list from payment provider.');
    }
  }

  async createPayin(
    amount: number,
    bankId: number,
    currency: string,
    orderId?: string,
    ip?: string,
    fio?: string,
    card?: string,
    clientId?: string,
    method?: RubPaymentMethod,
  ): Promise<NorosTransactionResponse> {
    this.logger.log(`Creating Noros pay-in for orderId: ${orderId}, amount: ${amount}, currency: ${currency}`);

    let currencyKey = currency;

    // For RUB, select appropriate variant
    if (currency === 'RUB') {
      currencyKey = this.selectRubVariant(amount, method);
      this.logger.log(`Selected RUB variant: ${currencyKey} for amount ${amount}`);
    }

    const requestBody = {
      amount,
      bankId,
      orderId,
      ip,
      fio,
      card,
      clientId,
    };

    try {
      const response = await axios.post<NorosTransactionResponse>(`${this.baseUrl}/transaction`, requestBody, {
        headers: this.getHeaders(currencyKey, 'api_key'),
      });
      this.logger.log(`Successfully created pay-in with Noros. Transaction ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating Noros pay-in: ${error.message}`);
      throw new BadRequestException('Payment provider error on creating transaction.');
    }
  }

  async getTransactionStatus(transId: number, currency: string, method?: RubPaymentMethod): Promise<NorosTransactionResponse> {
    this.logger.log(`Getting status for transaction ${transId}, currency: ${currency}`);

    let currencyKey = currency;

    // For RUB with method specified, use the specific variant
    if (currency === 'RUB' && method) {
      currencyKey = `RUB_${method}`;
      this.logger.log(`Using RUB variant: ${currencyKey}`);
    }
    // Note: currency may already be RUB_CLASSIC, RUB_1_5K, etc. from the database

    try {
      const response = await axios.get<NorosTransactionResponse>(`${this.baseUrl}/transaction/${transId}`, {
        headers: this.getHeaders(currencyKey, 'api_key'),
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting transaction status: ${error.message}`);
      throw new BadRequestException('Payment provider error on getting transaction status.');
    }
  }

  async createPayout(
    amount: number,
    currency: string,
    number: string,
    bankname: string,
    owner: string,
    uid?: string,
    method?: RubPaymentMethod,
  ): Promise<NorosPayoutResponse> {
    this.logger.log(`Creating Noros payout to ${number}, amount: ${amount}, currency: ${currency}`);

    let currencyKey = currency;

    // For RUB, select appropriate variant
    if (currency === 'RUB') {
      currencyKey = this.selectRubVariant(amount, method);
      this.logger.log(`Selected RUB variant: ${currencyKey} for payout amount ${amount}`);
    }

    const requestBody = {
      amount,
      number,
      bankname,
      owner,
      uid,
    };

    try {
      const response = await axios.post<NorosPayoutResponse>(`${this.baseUrl}/payout`, requestBody, {
        headers: this.getHeaders(currencyKey, 'api_secret_key'),
      });
      this.logger.log(`Successfully created payout with Noros. Payout ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating Noros payout: ${error.message}`);
      throw new BadRequestException('Payment provider error on creating payout.');
    }
  }
  
  async getBalance(currency: string, method?: RubPaymentMethod): Promise<NorosBalance> {
    this.logger.log(`Getting balance for ${currency}`);

    let currencyKey = currency;

    // For RUB, select appropriate variant
    if (currency === 'RUB') {
      if (method) {
        currencyKey = `RUB_${method}`;
      } else {
        // Default to CLASSIC if no method specified
        currencyKey = this.credentials.has('RUB_CLASSIC') ? 'RUB_CLASSIC' :
                      this.credentials.has('RUB_1_5K') ? 'RUB_1_5K' : 'RUB_ALFA';
      }
      this.logger.log(`Getting balance for RUB variant: ${currencyKey}`);
    }

    try {
      const response = await axios.get<NorosBalance>(`${this.baseUrl}/balance`, {
        headers: this.getHeaders(currencyKey, 'api_secret_key'),
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`);
      throw new BadRequestException('Payment provider error on getting balance.');
    }
  }

  /**
   * Get balances for all RUB variants
   */
  async getAllRubBalances(): Promise<{ variant: string; balance: NorosBalance }[]> {
    const results: { variant: string; balance: NorosBalance }[] = [];
    const rubVariants = ['RUB_CLASSIC', 'RUB_1_5K', 'RUB_ALFA'];

    for (const variant of rubVariants) {
      if (this.credentials.has(variant)) {
        try {
          const balance = await this.getBalance(variant);
          results.push({ variant, balance });
        } catch (error) {
          this.logger.error(`Failed to get balance for ${variant}: ${error.message}`);
        }
      }
    }

    return results;
  }
}
