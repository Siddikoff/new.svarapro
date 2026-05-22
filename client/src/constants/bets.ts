/**
 * Bet ladder used by lobby filters and the create-room modal.
 *
 * The values must stay in sync with `BET_LABELS` (same length, same order).
 *
 * Steps are chosen to cover the realistic spread of room bets (currently
 * 0.5 - 20 USDT in mocks, scaling up to large tables). Avoid leaving giant
 * gaps in the ladder — the filter slider snaps to indices and any gap means
 * a whole range of bets becomes unreachable.
 */

export const BET_LADDER: readonly number[] = [0.5, 1, 5, 10, 50, 100, 500] as const;

export const BET_LABELS: readonly string[] = ['0.5', '1', '5', '10', '50', '100', '500'] as const;

export const MOCK_TELEGRAM_USER_ID = 12_345_678;
