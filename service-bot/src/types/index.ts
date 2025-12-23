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

export interface AdminWithdrawSession {
  currency?: string;
  amount?: number;
  bankId?: number;
  method?: string; // RubPaymentMethod
  number?: string;
  bankname?: string;
  owner?: string;
  step: 'currency' | 'bank' | 'amount' | 'details' | 'confirm';
}
