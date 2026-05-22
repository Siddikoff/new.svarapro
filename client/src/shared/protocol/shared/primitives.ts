/**
 * Common scalar schemas reused across client- and server-bound events.
 *
 * Keep these tiny and pure — no zod transformations beyond what's needed
 * to express the wire format. The goal is one canonical source of truth
 * for things like "what's a valid Money value" so the same rules apply
 * to both REST responses and WebSocket payloads.
 */
import { z } from 'zod';

export const SeatIdSchema = z.union([z.number().int().nonnegative(), z.string().min(1)]);
export type SeatId = z.infer<typeof SeatIdSchema>;

export const PlayerIdSchema = z.union([z.number().int().nonnegative(), z.string().min(1)]);
export type PlayerId = z.infer<typeof PlayerIdSchema>;

export const RoomIdSchema = z.union([z.number().int().nonnegative(), z.string().min(1)]);
export type RoomId = z.infer<typeof RoomIdSchema>;

/**
 * Money is exchanged as a plain `number` (matches the API mocks and the
 * existing UI). Backend can swap to a `string` (decimal) without changing
 * the field shape — the schema would update to `z.string().regex(...)`.
 *
 * Negative values are valid (e.g. losses, refunds), but NaN/Infinity must
 * never reach the store.
 */
export const MoneySchema = z.number().finite();
export type Money = z.infer<typeof MoneySchema>;

/**
 * ISO-8601 timestamps as plain strings. Parsing into `Date` is the
 * consumer's job — keeping the wire format opaque means we can swap to
 * epoch ms later without rewriting reducers.
 */
export const TimestampSchema = z.string().datetime({ offset: true });
export type Timestamp = z.infer<typeof TimestampSchema>;
