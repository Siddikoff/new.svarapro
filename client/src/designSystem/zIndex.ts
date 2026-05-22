/**
 * z-index scale.
 *
 * Higher == in front. Reserve gaps so future overlays can slot in without
 * renumbering.
 */
export const Z_INDEX = {
  base: 1,
  table: 4,
  seats: 5,
  bottomBar: 50,
  sheet: 60,
  gameRoom: 9999,
  splash: 100,
  loader: 110,
  toast: 120,
} as const;

export type ZIndexToken = keyof typeof Z_INDEX;

export const zIndex = Z_INDEX;
