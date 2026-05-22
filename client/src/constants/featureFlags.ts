/**
 * Feature flags.
 *
 * Stage 7 ships the tournaments and ranking screens in mock-only mode
 * (the svarapro backend has no `/tournaments` / `/leaderboard` endpoints
 * yet) and we want a one-line toggle to hide them in production until
 * the API lands. The flags resolve at build time via Vite env vars so
 * the disabled branches tree-shake out of the production bundle.
 *
 * Truthiness mirrors the bash convention — anything other than the
 * literal `"0"`, `"false"`, or `""` is treated as enabled. Unset env
 * vars default to enabled, so the dev experience matches the v143
 * prototype out of the box.
 *
 * Override examples:
 *   VITE_FEATURE_TOURNAMENTS=0  # hide the Tournaments tab + screens
 *   VITE_FEATURE_RATING=false   # hide the Rating tab + screen
 */

const parseFlag = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) return fallback;
  const value = raw.trim().toLowerCase();
  if (value === '' || value === '0' || value === 'false' || value === 'off') {
    return false;
  }
  return true;
};

export interface FeatureFlags {
  /** Tournaments tab + list/details/game screens. */
  tournamentsEnabled: boolean;
  /** Rating tab + leaderboard screen. */
  ratingEnabled: boolean;
}

const env = import.meta.env ?? {};

export const featureFlags: FeatureFlags = {
  tournamentsEnabled: parseFlag(env.VITE_FEATURE_TOURNAMENTS as string | undefined, true),
  ratingEnabled: parseFlag(env.VITE_FEATURE_RATING as string | undefined, true),
};

/** Internal helper exported for unit tests. */
export const __testing__ = { parseFlag };
