import { Context } from "telegraf";

export interface ServiceBotContext extends Context {
  isAdmin?: boolean;
  locale?: "ru" | "en";
}

export type Locale = "ru" | "en";

export interface AdminSession {
  telegramId: string;
  isAuthenticated: boolean;
  loginAttempts: number;
  lastAttemptTime: number;
}

export interface AdminLoginState {
  telegramId: string;
  awaitingPassword: boolean;
  awaitingNewPassword: boolean;
}
