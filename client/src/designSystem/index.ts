/**
 * Design system entrypoint.
 *
 * All design primitives live in this folder, one file per concern:
 *   - colors.ts     — surface / text / tint / brand palette + theme helpers
 *   - spacing.ts    — spacing scale
 *   - radius.ts     — border-radius scale
 *   - shadows.ts    — elevation
 *   - typography.ts — font family / sizes / weights
 *   - zIndex.ts     — stacking order
 *   - motion.ts     — animation durations (ms)
 *   - layout.ts     — app dimensions
 *
 * Both UPPER_SNAKE (preferred) and lowerCamel aliases are exported to keep
 * pre-refactor imports working.
 */

export * from './colors';
export * from './layout';
export * from './motion';
export * from './radius';
export * from './shadows';
export * from './spacing';
export * from './typography';
export * from './zIndex';
