import { useEffect, useState } from 'react';

import { STORAGE_KEYS } from '../constants/app';
import { themeBackground } from '../designSystem';
import { applyTelegramChrome, onTelegramThemeChange } from '../services/telegram';
import { detectSystemTheme } from '../theme/systemTheme';

export type ThemeName = 'dark' | 'light';
export type ThemePref = ThemeName | 'system';

export interface UseThemeResult {
  themePref: ThemePref;
  activeTheme: ThemeName;
  setThemePref: (next?: ThemePref) => void;
}

const isThemePref = (value: unknown): value is ThemePref =>
  value === 'light' || value === 'dark' || value === 'system';

const readStoredPref = (): ThemePref => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (isThemePref(stored)) return stored;
  } catch {
    // ignore
  }
  return 'dark';
};

const persistThemePref = (pref: ThemePref): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, pref);
  } catch {
    // ignore
  }
};

const subscribeToSystemTheme = (handler: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  if (media.addEventListener) {
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }
  media.addListener(handler);
  return () => media.removeListener(handler);
};

const applyDocumentTheme = (themeName: ThemeName, isOled: boolean): string | null => {
  if (typeof document === 'undefined') return null;
  const backgroundColor = themeBackground(themeName, isOled);

  if (document.body) {
    document.body.setAttribute('data-theme', themeName);
    if (isOled) document.body.setAttribute('data-theme-variant', 'oled');
    else document.body.removeAttribute('data-theme-variant');
  }
  if (document.documentElement) {
    document.documentElement.style.background = backgroundColor;
  }

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', backgroundColor);

  return backgroundColor;
};

/**
 * useTheme — owns the light/dark/system preference and applies it everywhere.
 */
export const useTheme = (): UseThemeResult => {
  const [themePref, setThemePref] = useState<ThemePref>(readStoredPref);
  const [activeTheme, setActiveTheme] = useState<ThemeName>(() =>
    themePref === 'system' ? detectSystemTheme() : themePref,
  );

  useEffect(() => {
    persistThemePref(themePref);

    if (themePref !== 'system') {
      setActiveTheme(themePref);
      return;
    }

    setActiveTheme(detectSystemTheme());
    const update = (): void => setActiveTheme(detectSystemTheme());
    const unsubscribeMedia = subscribeToSystemTheme(update);
    const unsubscribeTelegram = onTelegramThemeChange(update);
    return () => {
      unsubscribeMedia();
      unsubscribeTelegram();
    };
  }, [themePref]);

  useEffect(() => {
    const isOled = themePref === 'system' && activeTheme === 'dark';
    const backgroundColor = applyDocumentTheme(activeTheme, isOled);
    if (backgroundColor) applyTelegramChrome(backgroundColor, activeTheme);
  }, [activeTheme, themePref]);

  const updateThemePref = (next?: ThemePref): void => {
    if (isThemePref(next)) {
      setThemePref(next);
      return;
    }
    setThemePref((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return { themePref, activeTheme, setThemePref: updateThemePref };
};
