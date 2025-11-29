import { ru } from "./ru.js";
import { en } from "./en.js";

export type Locale = "ru" | "en";

const locales = {
  ru,
  en,
};

export function getLocale(lang: Locale = "ru") {
  return locales[lang] || locales.ru;
}

export function getMessage(lang: Locale, key: string, ...args: unknown[]) {
  const locale = getLocale(lang);
  const keys = key.split(".");
  let message: unknown = locale;

  for (const k of keys) {
    message = (message as Record<string, unknown>)[k];
    if (!message) return key;
  }

  if (typeof message === "function") {
    return message(...args);
  }

  return message;
}
