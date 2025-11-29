import { LaunchParams } from '@telegram-apps/sdk-react';

// Интерфейс для Telegram WebApp
interface TelegramWebApp {
  version: string;
  // Можно добавить другие свойства, если они используются в вашем приложении
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    hash?: string;
    auth_date?: number;
    [key: string]: unknown;
  };
  // Добавьте другие методы или свойства, если они используются, например:
  // ready: () => void;
  // expand: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
  photo_url?: string;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
}

export interface TelegramInitData {
  auth_date: number;
  hash: string;
  user?: TelegramUser;
  query_id?: string;
  receiver?: TelegramUser;
  chat?: unknown;
  start_param?: string;
  can_send_after?: number;
}

export interface TelegramLaunchParams extends LaunchParams {
  initData?: TelegramInitData;
  initDataRaw?: string;
}
