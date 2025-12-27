import axios, { AxiosInstance } from "axios";

// RUB payment method types (matching server-side enum)
export enum RubPaymentMethod {
  CLASSIC = "CLASSIC", // 5000-100000 RUB, fee 15%
  SMALL = "1_5K", // 1000-4999 RUB, fee 16%
  ALFA = "ALFA", // 1000-100000 RUB, fee 12%, Alfa-Alfa internal
}

export interface NorosFiatTransactionResponse {
  norosId: string;
  clientID: string;
  receiver: string;
  bankName: string;
  recipientName: string;
  manual: string;
  exchangeRate: number;
  estimatedUSDT: number;
}

export interface UserProfile {
  id: string;
  telegramId: string;
  username?: string;
  avatar?: string;
  balance: number;
  walletAddress?: string;
}

export interface FiatTransactionHistoryItem {
  type: 'deposit' | 'withdraw';
  currency: string;
  fiat_amount: number;
  amount: number; // USDT amount
  status: string;
  createdAt: string;
  token: string;
  tracker_id: string;
}

export interface NorosBank {
  id: number;
  name: string;
  logo: string;
}

export class ApiService {
  private api: AxiosInstance;

  constructor() {
    const apiBaseUrl =
      process.env.API_BASE_URL || "https://svarapro.com/api/v1";
    this.api = axios.create({
      baseURL: apiBaseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async getFiatBanks(
    currency: string,
    amount?: number,
    method?: RubPaymentMethod,
  ): Promise<NorosBank[]> {
    try {
      const params: any = { currency };
      if (amount !== undefined) {
        params.amount = amount;
      }
      if (method !== undefined) {
        params.method = method;
      }

      const response = await this.api.get<NorosBank[]>(
        "/finances/fiat/banks",
        { params },
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async createFiatTransaction(
    telegramId: string,
    amount: number,
    bankId: number,
    currency: string,
    method?: RubPaymentMethod,
  ): Promise<NorosFiatTransactionResponse> {
    try {
      const requestBody: any = {
        telegramId,
        amount,
        bankId,
        currency,
        userInfo: {
          id: telegramId,
        },
      };

      if (method !== undefined) {
        requestBody.method = method;
      }

      const response = await this.api.post<NorosFiatTransactionResponse>(
        "/finances/fiat/transaction",
        requestBody,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async createFiatWithdraw(
    telegramId: string,
    amount: number,
    currency: string,
    number: string,
    bankname: string,
    owner: string,
    method?: RubPaymentMethod,
  ): Promise<{
    payoutId: number;
    clientID: string;
    status: string;
  }> {
    try {
      const requestBody: any = {
        telegramId,
        amount,
        currency,
        number,
        bankname,
        owner,
      };

      if (method !== undefined) {
        requestBody.method = method;
      }

      const response = await this.api.post<{
        payoutId: number;
        clientID: string;
        status: string;
      }>("/finances/fiat/withdraw", requestBody);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async ensureUser(
    telegramId: string,
    userData?: {
      username?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<void> {
    try {
      await this.api.post("/users/ensure", {
        telegramId,
        ...userData,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async getUserProfile(telegramId: string): Promise<UserProfile> {
    try {
      const response = await this.api.get<UserProfile>(
        `/users/profile/${telegramId}`,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async getFiatTransactionHistory(telegramId: string): Promise<FiatTransactionHistoryItem[]> {
    try {
      const response = await this.api.get<FiatTransactionHistoryItem[]>(
        `/finances/history/fiat/${telegramId}`,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async getFiatRates(): Promise<{ currency: string; rate: number }[]> {
    try {
      const response = await this.api.get<{ currency: string; rate: number }[]>(
        "/finances/fiat/rates",
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async confirmFiatTransaction(norosId: string): Promise<void> {
    try {
      await this.api.patch(
        `/finances/fiat/transaction/${norosId}/proof`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }
  async getSystemWalletBalance(): Promise<{ balance: number }> {
    try {
      const response = await this.api.get<{ balance: number }>(
        '/finances/system-wallet',
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || 'Unknown error';
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async createSystemWalletWithdraw(
    telegramId: string,
    amount: number,
    currency: string,
    number: string,
    bankname: string,
    owner: string,
    method?: RubPaymentMethod,
  ): Promise<{
    payoutId: number;
    clientID: string;
    status: string;
  }> {
    try {
      const requestBody: any = {
        telegramId,
        amount,
        currency,
        number,
        bankname,
        owner,
      };

      if (method !== undefined) {
        requestBody.method = method;
      }

      const response = await this.api.post<{
        payoutId: number;
        clientID: string;
        status: string;
      }>('/finances/system-wallet/withdraw', requestBody);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || 'Unknown error';
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }

  async resetSystemWalletBalance(): Promise<{ status: string; message: string }> {
    try {
      const response = await this.api.post<{ status: string; message: string }>(
        '/finances/system-wallet/reset',
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || error.message || 'Unknown error';
        throw new Error(`API error: ${message}`);
      }
      throw error;
    }
  }
}
