/**
 * Motion tokens (ms). Kept alongside the other design primitives so animation
 * timings stay coherent across components.
 */
export const MOTION = {
  fast: 150,
  base: 200,
  slow: 320,
  sheet: 320,
  rotate: 500,
} as const;

export type MotionToken = keyof typeof MOTION;

export const motion = MOTION;
