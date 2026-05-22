import { useEffect } from 'react';

import { getTelegramWebApp, initTelegramShell } from '../services/telegram';

/**
 * Initialises the Telegram WebApp shell once on mount.
 *
 * Returns the raw WebApp object so callers can read user info / platform
 * if needed — never mutate Telegram directly from components, prefer the
 * helpers in `services/telegram.ts`.
 */
export const useTelegram = (): TelegramWebApp | null => {
  useEffect(() => {
    initTelegramShell();
  }, []);

  return getTelegramWebApp();
};
