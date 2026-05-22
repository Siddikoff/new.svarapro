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
