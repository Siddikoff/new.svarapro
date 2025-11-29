import axios from "axios";

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  refBalance: number;
  refBonus: number;
  totalDeposit: number;
  walletAddress?: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export class UsersService {
  private readonly API_BASE_URL = process.env.API_BASE_URL;
  private readonly API_SECRET = process.env.API_SECRET;

  async getUsers(page: number = 1, limit: number = 10): Promise<UsersResponse> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/admin/users`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${this.API_SECRET}` },
      });

      return response.data;
    } catch (error) {
      console.error("Get users error:", error);
      throw error;
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/admin/users/search`,
        {
          params: { q: query },
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.data.users;
    } catch (error) {
      console.error("Search users error:", error);
      throw error;
    }
  }

  async getUserById(telegramId: string): Promise<User | null> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/admin/users/${telegramId}`,
        {
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (
          axiosError.response?.status === 400 ||
          axiosError.response?.status === 404
        ) {
          console.log(`User ${telegramId} not found`);
          return null;
        }
      }
      console.error("Get user error:", error);
      throw error;
    }
  }

  async updateBalance(
    telegramId: string,
    amount: number,
    operation: "add" | "remove",
  ): Promise<User> {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/admin/users/${telegramId}/balance`,
        {
          amount,
          operation,
        },
        {
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Update balance error:", error);
      throw error;
    }
  }
}
