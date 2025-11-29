import axios from "axios";
import { AdminSession, AdminLoginState } from "../types/index.js";

export class AdminService {
  private sessions = new Map<string, AdminSession>();
  private loginStates = new Map<string, AdminLoginState>();

  private readonly API_BASE_URL = process.env.API_BASE_URL;
  private readonly API_SECRET = process.env.API_SECRET;

  // Проверка пароля (только буквы и цифры, 6-20 символов)
  validatePassword(password: string): boolean {
    const passwordRegex = /^[a-zA-Z0-9]{6,20}$/;
    return passwordRegex.test(password);
  }

  // Проверка, есть ли пользователь в списке админов из .env
  isInAdminList(telegramId: string): boolean {
    const adminIds =
      process.env.ADMIN_IDS?.split(",").map((id) => id.trim()) || [];
    return adminIds.includes(telegramId);
  }

  // Проверка, есть ли у админа пароль в БД
  async hasPassword(telegramId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.API_BASE_URL}/admins/has-password/${telegramId}`,
        {
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.data.hasPassword;
    } catch (error) {
      console.error("Check password error:", error);
      return false;
    }
  }

  // Создание пароля админа
  async createPassword(telegramId: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/admins/create-password`,
        {
          telegramId,
          password,
        },
        {
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.status === 201;
    } catch (error) {
      console.error("Create password error:", error);
      return false;
    }
  }

  // Проверка пароля админа
  async verifyPassword(telegramId: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/admins/verify-password`,
        {
          telegramId,
          password,
        },
        {
          headers: { Authorization: `Bearer ${this.API_SECRET}` },
        },
      );

      return response.data.isValid;
    } catch (error) {
      console.error("Verify password error:", error);
      return false;
    }
  }

  // Управление сессиями
  getSession(telegramId: string): AdminSession | undefined {
    return this.sessions.get(telegramId);
  }

  setSession(telegramId: string, session: AdminSession): void {
    this.sessions.set(telegramId, session);
  }

  clearSession(telegramId: string): void {
    this.sessions.delete(telegramId);
  }

  // Управление состояниями логина
  getLoginState(telegramId: string): AdminLoginState | undefined {
    return this.loginStates.get(telegramId);
  }

  setLoginState(telegramId: string, state: AdminLoginState): void {
    this.loginStates.set(telegramId, state);
  }

  clearLoginState(telegramId: string): void {
    this.loginStates.delete(telegramId);
  }

  // Проверка авторизации
  isAuthenticated(telegramId: string): boolean {
    const session = this.getSession(telegramId);
    return session?.isAuthenticated || false;
  }

  // Управление состоянием изменения баланса
  private balanceStates = new Map<
    string,
    { action: "add" | "remove"; telegramId: string }
  >();

  getBalanceState(telegramId: string) {
    return this.balanceStates.get(telegramId);
  }

  setBalanceState(
    telegramId: string,
    state: { action: "add" | "remove"; telegramId: string },
  ) {
    this.balanceStates.set(telegramId, state);
  }

  clearBalanceState(telegramId: string) {
    this.balanceStates.delete(telegramId);
  }

  // Управление состоянием поиска
  private searchStates = new Set<string>();

  isInSearchState(telegramId: string): boolean {
    return this.searchStates.has(telegramId);
  }

  setSearchState(telegramId: string): void {
    this.searchStates.add(telegramId);
  }

  clearSearchState(telegramId: string): void {
    this.searchStates.delete(telegramId);
  }
}
