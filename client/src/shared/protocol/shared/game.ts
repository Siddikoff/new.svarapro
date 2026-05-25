/**
 * Game-state schemas: seat occupancy, table phase, bet labels.
 *
 * `SeatStateSchema` covers what the server pushes per seat — UI
 * decorations (animations, hover state) are NOT part of the wire format.
 */
import { z } from 'zod';

import { CardSchema } from './card';
import { MoneySchema, SeatIdSchema } from './primitives';

export const GamePhaseSchema = z.enum([
  'idle',
  'dealing',
  'betting',
  'showdown',
  'round_end',
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

/**
 * Per-seat snapshot.  `hand` is server-side and only included for the
 * receiving player's own seat; other seats see `cardCount` instead.
 */
export const SeatStateSchema = z.object({
  seatId: SeatIdSchema,
  /**
   * Backend identity of the player occupying this seat (Telegram user id as
   * a string for the svarapro backend). Optional because mock / test
   * snapshots may omit it; real wire frames always include it.
   *
   * GameRoom uses this to identify which seat is the local player without
   * relying on the seat's position number — that lets the table rotate so
   * the local user always sits at the bottom regardless of the server-side
   * `position` they were assigned.
   */
  telegramId: z.string().optional(),
  stack: MoneySchema.optional(),
  bet: MoneySchema.optional(),
  /** Profile photo index (matches `assets/avatars/<n>.png`). */
  photo: z.union([z.string(), z.number().int().nonnegative()]).optional(),
  name: z.string().optional(),
  folded: z.boolean().optional(),
  dealer: z.boolean().optional(),
  /** Server-side only for the receiving player. */
  hand: z.array(CardSchema).optional(),
  /** Number of cards held — for opponents (face-down). */
  cardCount: z.number().int().nonnegative().optional(),
  /**
   * Server bookkeeping flags for the betting reducer. Mirrored from
   * `SvaraPlayer` so the UI can gate Look/Pass/Call/Raise buttons on
   * the server's source-of-truth rather than local optimistic state.
   */
  hasLooked: z.boolean().optional(),
  /**
   * True after a blind-phase look — the player MUST act with
   * call / raise / fold (see server `betting.service.ts:canPerformAction`).
   */
  hasLookedAndMustAct: z.boolean().optional(),
});
export type SeatState = z.infer<typeof SeatStateSchema>;

/**
 * Map of seatId → SeatState. Zod's `record(key, value)` enforces that
 * every value matches `SeatStateSchema`; the key is coerced to string by
 * JSON anyway, so we accept `z.string()` as the index and let the schema
 * value carry the canonical SeatId.
 */
export const SeatMapSchema = z.record(z.string(), SeatStateSchema);
export type SeatMap = z.infer<typeof SeatMapSchema>;
