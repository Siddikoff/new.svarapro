/**
 * Thin wrapper around `window.Telegram.WebApp`.
 *
 * All access to Telegram APIs goes through here so that:
 *   - We don't have try/catch noise scattered across components.
 *   - Components stay testable when running outside Telegram.
 *   - Hooks (`useTelegram`, `useBackButton`) compose these primitives.
 */

import type { ThemeName } from '../constants/app';

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
};

/**
 * Returns the current Telegram user ID, or null if the app is not running
 * inside Telegram (e.g. preview in a regular browser).
 *
 * NOTE: `initDataUnsafe` is **not safe** for authorisation — never trust it
 * on its own. The backend must verify the signed `initData` payload using
 * the bot token. This helper is only for cosmetic uses like building a
 * referral link prefilled with the current user's id, where mis-attribution
 * is the worst possible outcome.
 */
export const getTelegramUserId = (): number | null => {
  const telegram = getTelegramWebApp();
  const id = telegram?.initDataUnsafe?.user?.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
};

/**
 * Cosmetic user fields (name, photo) for rendering — same trust caveat as
 * `getTelegramUserId`: not safe for authorisation, never trusted by the
 * server. The signed `initData` string + the `/auth/login` flow is the
 * real authentication path.
 */
export interface TelegramUserProfile {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export const getTelegramUser = (): TelegramUserProfile | null => {
  const telegram = getTelegramWebApp();
  return telegram?.initDataUnsafe?.user ?? null;
};

/** Raw signed `initData` string + start_param for the `/auth/login` flow. */
export interface TelegramAuthPayload {
  initData: string;
  startPayload?: string;
}

export const getTelegramAuthPayload = (): TelegramAuthPayload | null => {
  const telegram = getTelegramWebApp();
  const initData = telegram?.initData;
  if (typeof initData !== 'string' || initData.length === 0) return null;
  const startPayload = telegram?.initDataUnsafe?.start_param;
  return { initData, startPayload: typeof startPayload === 'string' ? startPayload : undefined };
};

const safeInvoke = (fn: (() => void) | undefined): void => {
  if (typeof fn !== 'function') return;
  try {
    fn();
  } catch {
    // Some Telegram methods throw on older clients; swallow silently.
  }
};

export const initTelegramShell = (): void => {
  const telegram = getTelegramWebApp();
  if (!telegram) return;
  safeInvoke(() => telegram.ready?.());
  safeInvoke(() => telegram.expand?.());
  safeInvoke(() => telegram.disableVerticalSwipes?.());
  safeInvoke(() => telegram.enableClosingConfirmation?.());
};

export const requestTelegramFullscreen = (): void => {
  const telegram = getTelegramWebApp();
  if (!telegram) return;
  safeInvoke(() => telegram.expand?.());
  safeInvoke(() => telegram.requestFullscreen?.());
};

export const exitTelegramFullscreen = (): void => {
  const telegram = getTelegramWebApp();
  if (!telegram) return;
  safeInvoke(() => telegram.exitFullscreen?.());
};

export const applyTelegramChrome = (backgroundColor: string, themeName: ThemeName): void => {
  const telegram = getTelegramWebApp();
  if (!telegram) return;

  const fallbackToken = themeName === 'light' ? 'secondary_bg_color' : 'bg_color';

  try {
    telegram.setHeaderColor?.(backgroundColor);
  } catch {
    safeInvoke(() => telegram.setHeaderColor?.(fallbackToken));
  }

  try {
    telegram.setBackgroundColor?.(backgroundColor);
  } catch {
    safeInvoke(() => telegram.setBackgroundColor?.(fallbackToken));
  }

  safeInvoke(() => telegram.setBottomBarColor?.(backgroundColor));
};

export const onTelegramThemeChange = (handler: () => void): (() => void) => {
  const telegram = getTelegramWebApp();
  if (!telegram?.onEvent) return () => {};
  telegram.onEvent('themeChanged', handler);
  return () => {
    try {
      telegram.offEvent?.('themeChanged', handler);
    } catch {
      // ignore
    }
  };
};

export const showBackButton = (handler: () => void): (() => void) => {
  const telegram = getTelegramWebApp();
  const backButton = telegram?.BackButton;
  if (!backButton) return () => {};

  safeInvoke(() => backButton.show?.());
  safeInvoke(() => backButton.onClick?.(handler));

  return () => {
    try {
      backButton.offClick?.(handler);
    } catch {
      // ignore
    }
    safeInvoke(() => backButton.hide?.());
  };
};

export const hideBackButton = (): void => {
  const telegram = getTelegramWebApp();
  safeInvoke(() => telegram?.BackButton?.hide?.());
};

/**
 * Open Telegram's native share-link sheet for a URL + text.
 *
 * Tries (in order):
 *   1. `WebApp.openTelegramLink('https://t.me/share/url?...')` — native sheet
 *      when running inside Telegram.
 *   2. `navigator.share(...)` — OS share sheet when running in a regular
 *      mobile browser.
 *   3. `window.open(...)` — fallback that opens t.me/share/url in a new tab.
 */
export const shareToTelegram = ({ url, text }: { url: string; text: string }): void => {
  const shareUrl =
    'https://t.me/share/url?url=' +
    encodeURIComponent(url) +
    '&text=' +
    encodeURIComponent(text);

  const telegram = getTelegramWebApp();
  try {
    if (telegram && typeof telegram.openTelegramLink === 'function') {
      telegram.openTelegramLink(shareUrl);
      return;
    }
  } catch {
    // fall through
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator.share({ url, text });
      return;
    }
  } catch {
    // fall through
  }

  try {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  } catch {
    // last resort — nothing else we can do.
  }
};
