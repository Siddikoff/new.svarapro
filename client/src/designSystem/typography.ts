/**
 * Typography tokens.
 *
 * Sizes/weights for body, headings, captions, and the watermark font used on
 * the GameRoom felt. Family is system-first so we don't ship custom fonts.
 */
export const FONT_FAMILY = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display'," +
    " system-ui, 'Helvetica Neue', Arial, sans-serif",
  mono: "'SF Mono', 'Menlo', 'Consolas', 'Roboto Mono', ui-monospace, monospace",
  display: "'Bebas Neue', 'Russo One', sans-serif",
} as const;

export interface TypographyVariant {
  family: string;
  size: number;
  weight: number;
  letterSpacing?: string;
}

export const TYPOGRAPHY: Record<'body' | 'heading' | 'caption' | 'watermark', TypographyVariant> = {
  body: {
    family: FONT_FAMILY.system,
    size: 14,
    weight: 400,
  },
  heading: {
    family: FONT_FAMILY.system,
    size: 18,
    weight: 700,
  },
  caption: {
    family: FONT_FAMILY.system,
    size: 11,
    weight: 500,
  },
  watermark: {
    family: FONT_FAMILY.mono,
    size: 16,
    weight: 500,
    letterSpacing: '0.5px',
  },
};

export type TypographyToken = keyof typeof TYPOGRAPHY;

export const typography = TYPOGRAPHY;
