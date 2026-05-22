/**
 * Payload schemas for every client-to-server event.
 *
 * Use these to validate outgoing payloads *before* sending. The
 * `wsClient.send` API stays unchecked at runtime (sends are not
 * adversarial here) but TypeScript users get the right argument type
 * from `ClientToServerEvents`.
 */
import { z } from 'zod';

import { MoneySchema, RoomIdSchema } from '../shared';

/**
 * Telegram `initData` is verified server-side using the bot token —
 * the client just forwards it as an opaque string here.
 */
export const AuthPayloadSchema = z.object({
  initData: z.string().min(1),
});
export type AuthPayload = z.infer<typeof AuthPayloadSchema>;

export const JoinRoomPayloadSchema = z.object({
  roomId: RoomIdSchema,
  /** Plain-text room password if the room is locked. */
  password: z.string().optional(),
  /** Spectator mode — server returns observe-only snapshots. */
  asSpectator: z.boolean().optional(),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const LeaveRoomPayloadSchema = z.object({
  roomId: RoomIdSchema,
});
export type LeaveRoomPayload = z.infer<typeof LeaveRoomPayloadSchema>;

/**
 * Bet actions. `kind` is the action class; `amount` is required only
 * when the action carries a chip value (raise / blind raise / blind).
 * `open` is an action without a chip cost (peek at your cards).
 */
export const BetKindSchema = z.enum([
  'call',
  'raise',
  'blind_raise',
  'blind',
  'fold',
  'check',
  'open',
]);
export type BetKind = z.infer<typeof BetKindSchema>;

export const PlaceBetPayloadSchema = z.object({
  roomId: RoomIdSchema,
  kind: BetKindSchema,
  amount: MoneySchema.optional(),
});
export type PlaceBetPayload = z.infer<typeof PlaceBetPayloadSchema>;

export const ChatMessagePayloadSchema = z.object({
  roomId: RoomIdSchema,
  text: z.string().min(1).max(500),
});
export type ChatMessagePayload = z.infer<typeof ChatMessagePayloadSchema>;

/**
 * Client heartbeat. `t` is the client's monotonic timestamp — the server
 * echoes it in `PongPayload.t` so the client can measure RTT. The
 * heartbeat doubles as a dead-connection detector: if no pong arrives
 * within the timeout, the socket is forcibly closed and reconnect kicks
 * in.
 */
export const PingPayloadSchema = z.object({
  t: z.number().int().nonnegative(),
});
export type PingPayload = z.infer<typeof PingPayloadSchema>;

/**
 * Explicit resync request. Sent on reconnect (after the socket re-opens)
 * and on version-mismatch desync — the server replies with a full
 * `RoomState` snapshot. `sinceVersion` is informational and lets the
 * server fast-path with a delta when the gap is small.
 */
export const RequestSnapshotPayloadSchema = z.object({
  roomId: RoomIdSchema,
  sinceVersion: z.number().int().nonnegative().optional(),
});
export type RequestSnapshotPayload = z.infer<typeof RequestSnapshotPayloadSchema>;
