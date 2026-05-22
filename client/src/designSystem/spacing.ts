/**
 * Spacing scale (pixels).
 *
 * Used as raw numbers in inline-styles and as CSS variables in `.module.css`
 * via the generated `:root` block.
 */
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  xxxl: 20,
  huge: 24,
} as const;

export type SpacingToken = keyof typeof SPACING;

// Legacy lowercase alias to avoid breaking existing imports of `spacing`.
export const spacing = SPACING;
