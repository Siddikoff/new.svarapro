/**
 * Payload schemas for every server-to-client event.
 *
 * One schema per event, exported individually so:
 *   - Stores can `.parse()` a specific payload without pulling the union.
 *   - Tests can construct typed fixtures via `payload satisfies <T>`.
 *
 * Adding fields:
 *   - Optional fields → safe (older clients ignore them).
 *   - Required fields → bump a protocol version and document the cutoff.
 */
import { z } from 'zod';

import {
  GamePhaseSchema,
  MoneySchema,
  ProtocolErrorSchema,
  SeatIdSchema,
  SeatMapSchema,
  SeatStateSchema,
  TimestampSchema,
} from '../shared';

/** Full authoritative room snapshot. Sent on join and after reconnect. */
export const RoomStatePayloadSchema = z.object({
  /** Monotonically increasing — used by reconciliation to drop stale snapshots. */
  version: z.number().int().nonnegative().optional(),
  seats: SeatMapSchema,
  pot: MoneySchema,
  phase: GamePhaseSchema,
  winnerId: SeatIdSchema.nullable().optional(),
  /** Player whose turn it is, if `phase === 'betting'`. */
  activeSeatId: SeatIdSchema.nullable().optional(),
  /**
   * Betting metadata mirrored from the svarapro `GameState`. Optional so
   * mock/test snapshots that pre-date this schema still parse cleanly.
   *
   * - `minBet`           — table ante / minimum bet for this round.
   * - `currentBet`       — highest committed bet by any active player.
   * - `lastBlindBet`     — last `blind_bet` amount (used by the next
   *                        blind bettor: their required amount is x2).
   * - `lastActionAmount` — amount of the last call/raise (used by the
   *                        UI to compute callAmount and raise presets).
   */
  minBet: MoneySchema.optional(),
  currentBet: MoneySchema.optional(),
  lastBlindBet: MoneySchema.optional(),
  lastActionAmount: MoneySchema.optional(),
  /**
   * Turn-clock metadata. `turnStartTime` is `Date.now()` on the server
   * when the current turn began; `turnDurationMs` is the per-turn
   * budget. The UI subtracts elapsed time from this so reconnects don't
   * reset the visible clock.
   */
  turnStartTime: z.number().int().nonnegative().nullable().optional(),
  turnDurationMs: z.number().int().nonnegative().optional(),
});
export type RoomStatePayload = z.infer<typeof RoomStatePayloadSchema>;

/**
 * Periodic delta. `t` is server time (ms) — used for animation
 * interpolation and desync detection (drop ticks where `t` is older
 * than the last applied snapshot/tick). `version` matches the room
 * version the tick was produced for; a mismatch is a hard desync and
 * the client must request a fresh snapshot.
 *
 * Reducers should treat the payload as a patch, not as a full snapshot.
 */
export const GameTickPayloadSchema = z.object({
  t: z.number().int().nonnegative(),
  /** Room version this tick belongs to (matches `RoomState.version`). */
  version: z.number().int().nonnegative().optional(),
  seats: SeatMapSchema.optional(),
  pot: MoneySchema.optional(),
  phase: GamePhaseSchema.optional(),
  activeSeatId: SeatIdSchema.nullable().optional(),
});
export type GameTickPayload = z.infer<typeof GameTickPayloadSchema>;

export const PlayerJoinedPayloadSchema = z.object({
  seatId: SeatIdSchema,
  seat: SeatStateSchema,
});
export type PlayerJoinedPayload = z.infer<typeof PlayerJoinedPayloadSchema>;

export const PlayerLeftPayloadSchema = z.object({
  seatId: SeatIdSchema,
});
export type PlayerLeftPayload = z.infer<typeof PlayerLeftPayloadSchema>;

export const RoundResultPayloadSchema = z.object({
  winnerId: SeatIdSchema.nullable().optional(),
  /** Net change to the receiving player's balance (signed). */
  balanceDelta: MoneySchema.optional(),
  /** Server timestamp the round closed at. */
  at: TimestampSchema.optional(),
});
export type RoundResultPayload = z.infer<typeof RoundResultPayloadSchema>;

export const ErrorPayloadSchema = ProtocolErrorSchema;
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

/**
 * Server `pong` reply. `t` echoes the client's `ping.t` so the client
 * can measure round-trip time; `serverTime` is informational (clock
 * skew diagnostics).
 */
export const PongPayloadSchema = z.object({
  t: z.number().int().nonnegative(),
  serverTime: z.number().int().nonnegative().optional(),
});
export type PongPayload = z.infer<typeof PongPayloadSchema>;
