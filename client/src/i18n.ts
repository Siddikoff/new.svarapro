import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import ruCommon from './locales/ru/common.json';
import ruErrors from './locales/ru/errors.json';

/**
 * i18next bootstrap for the redesigned client.
 *
 * Keeps the two-namespace setup (`common` / `errors`) inherited from the
 * previous svarapro client so we can port keys 1-to-1 across PRs without
 * rewriting them. Default language is Russian; English falls back to RU
 * for any missing key so partial migrations don't break the UI.
 *
 * Initial language: read from `localStorage` (key `svara.lang`) so the
 * user's last pick survives a reload. Falls back to `ru`.
 */
const LANG_STORAGE_KEY = 'svara.lang';
const SUPPORTED_LANGS = ['ru', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGS)[number];

const isSupported = (value: string | null): value is SupportedLanguage =>
  value === 'ru' || value === 'en';

const readStoredLang = (): SupportedLanguage => {
  if (typeof window === 'undefined') return 'ru';
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isSupported(stored) ? stored : 'ru';
  } catch {
    return 'ru';
  }
};

void i18n.use(initReactI18next).init({
  lng: readStoredLang(),
  fallbackLng: 'ru',
  ns: ['common', 'errors'],
  defaultNS: 'common',
  resources: {
    en: { common: enCommon, errors: enErrors },
    ru: { common: ruCommon, errors: ruErrors },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  if (typeof window === 'undefined' || !isSupported(lng)) return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    // localStorage may be unavailable inside Telegram in-app webview
    // sandboxes — silently ignore so the user can still switch language
    // within the current session.
  }
});

export const SUPPORTED_LANGUAGES = SUPPORTED_LANGS;

export default i18n;
