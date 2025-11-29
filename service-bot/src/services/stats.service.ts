import axios from "axios";

export interface Stats {
  deposits: number;
  withdrawals: number;
  profit: number;
  gamesCount: number;
  period: string;
}

export interface StatsResponse {
  day: Stats;
  week: Stats;
  month: Stats;
  total: Stats;
}

export class StatsService {
  private readonly API_BASE_URL = process.env.API_BASE_URL;
  private readonly API_SECRET = process.env.API_SECRET;

  async getStats(): Promise<StatsResponse> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${this.API_SECRET}` },
      });

      return response.data;
    } catch (error) {
      console.error("Get stats error:", error);
      throw error;
    }
  }
}
