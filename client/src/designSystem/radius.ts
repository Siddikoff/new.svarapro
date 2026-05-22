/**
 * Border-radius scale (pixels).
 */
export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof RADIUS;

export const radii = RADIUS;
