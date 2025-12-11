import { Context } from "telegraf";

export type Match = RegExpExecArray | string[];

export interface ServiceBotContext extends Context {
  isAdmin?: boolean;
  locale?: "ru" | "en";
  match?: Match;
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
