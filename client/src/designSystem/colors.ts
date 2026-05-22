/**
 * Color tokens.
 *
 * The app is theme-aware (`dark`, `light`, `dark+oled`). All theme-dependent
 * colors are CSS variables declared in `index.html` per `[data-theme]`, so we
 * expose them as `var(--name)` references. Brand colors are fixed and live
 * here as raw values.
 *
 * Usage:
 *   import { COLORS } from 'src/designSystem';
 *   <div style={{ background: COLORS.bg, color: COLORS.text }} />
 *
 * Or via CSS Modules:
 *   .card { background: var(--bg2); color: var(--text); }
 */

import type { ThemeName } from '../constants/app';

// Theme-aware tokens — resolved at runtime by [data-theme] on <body>.
export const SURFACE = {
  bg: 'var(--bg)',
  bg2: 'var(--bg2)',
  bg3: 'var(--bg3)',
  input: 'var(--input)',
  div: 'var(--div)',
  shadow: 'var(--shadow)',
  toggleOff: 'var(--toggle-off)',
} as const;

export const TEXT = {
  primary: 'var(--text)',
  hint: 'var(--hint)',
} as const;

// Soft tint backgrounds (accent-on-surface). Theme-aware.
export const TINTS = {
  blue: 'var(--tint-blue)',
  green: 'var(--tint-green)',
  gold: 'var(--tint-gold)',
  red: 'var(--tint-red)',
  purple: 'var(--tint-purple)',
  success: 'var(--tint-success)',
} as const;

// Brand colors — same in every theme.
export const BRAND = {
  accent: '#2481cc',
  green: '#4dcd5e',
  red: '#e05c5c',
  gold: '#f5a623',
  usdt: '#26A17B',
  // Neutral hex shortcuts for inline-style migrations off raw '#fff' / '#000'.
  white: '#ffffff',
  black: '#000000',
} as const;

// Aggregate token. Kept compatible with the legacy `palette` export so
// `import { COLORS } from 'designSystem'` is a drop-in for the old `palette`.
export const COLORS = {
  ...SURFACE,
  text: TEXT.primary,
  hint: TEXT.hint,
  tintBlue: TINTS.blue,
  tintGreen: TINTS.green,
  tintGold: TINTS.gold,
  tintRed: TINTS.red,
  tintPurple: TINTS.purple,
  tintSuccess: TINTS.success,
  accent: BRAND.accent,
  green: BRAND.green,
  red: BRAND.red,
  gold: BRAND.gold,
} as const;

export type ColorToken = keyof typeof COLORS;

// Helper for the top-level body background — used by services/telegram.ts to
// sync the Telegram WebApp chrome (header / bottom-bar / background colors).
export function themeBackground(themeName: ThemeName, isOled: boolean): string {
  if (themeName === 'light') return '#f1f4f8';
  if (isOled) return '#000000';
  return '#17212b';
}
