import type { ThemeName } from '../constants/app';
import { getTelegramWebApp } from '../services/telegram';

/**
 * Detect the user's preferred theme using (in order):
 *   1. Telegram WebApp `colorScheme` when running inside Telegram.
 *   2. The browser `prefers-color-scheme` media query.
 *   3. Falls back to dark.
 */
export const detectSystemTheme = (): ThemeName => {
  const telegram = getTelegramWebApp();
  const colorScheme = (telegram as { colorScheme?: string } | null)?.colorScheme;
  const inTelegram = Boolean(
    telegram && (telegram.initData || (telegram.platform && telegram.platform !== 'unknown')),
  );
  if (inTelegram && colorScheme) {
    return colorScheme === 'light' ? 'light' : 'dark';
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const matches = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return matches ? 'dark' : 'light';
  }

  if (colorScheme) {
    return colorScheme === 'light' ? 'light' : 'dark';
  }

  return 'dark';
};
