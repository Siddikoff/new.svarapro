/**
 * App-level constants: storage keys, mock identifiers, default thresholds.
 */

export const STORAGE_KEYS = {
  theme: 'svara_theme',
  sound: 'svara_sound',
  vibration: 'svara_vibration',
  tableFelt: 'svara_table_felt',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const TELEGRAM_THEMES = ['dark', 'light', 'system'] as const;
export type ThemePref = (typeof TELEGRAM_THEMES)[number];
export type ThemeName = Exclude<ThemePref, 'system'>;

export const ROOM_LOADER_DELAY_MS = 1800;

/**
 * Default house rake (%), used until rooms are served by the backend with
 * their own `rakePercent` field.
 */
export const DEFAULT_RAKE_PERCENT = 3;
