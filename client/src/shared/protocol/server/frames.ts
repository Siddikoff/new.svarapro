/**
 * Server → client envelope.
 *
 * Every frame on the wire looks like `{ type, payload }`. The
 * discriminated union below pairs each event name with the matching
 * payload schema, so a single `safeParse(rawJson)` either yields a
 * fully-typed frame or a detailed error.
 *
 * The mapped `ServerToClientEvents` type is what consumers (stores,
 * tests) should use when they need "name → payload" lookups —
 * matches the shape the user asked for in stage 2.
 */
import { z } from 'zod';

import { SERVER_EVENTS } from './events';
import {
  type ErrorPayload,
  ErrorPayloadSchema,
  type GameTickPayload,
  GameTickPayloadSchema,
  type PlayerJoinedPayload,
  PlayerJoinedPayloadSchema,
  type PlayerLeftPayload,
  PlayerLeftPayloadSchema,
  type PongPayload,
  PongPayloadSchema,
  type RoomStatePayload,
  RoomStatePayloadSchema,
  type RoundResultPayload,
  RoundResultPayloadSchema,
} from './payloads';

export const ServerFrameSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(SERVER_EVENTS.ROOM_STATE), payload: RoomStatePayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.GAME_TICK), payload: GameTickPayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.PLAYER_JOINED), payload: PlayerJoinedPayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.PLAYER_LEFT), payload: PlayerLeftPayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.ROUND_RESULT), payload: RoundResultPayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.ERROR), payload: ErrorPayloadSchema }),
  z.object({ type: z.literal(SERVER_EVENTS.PONG), payload: PongPayloadSchema }),
]);

export type ServerFrame = z.infer<typeof ServerFrameSchema>;

/** Stage-2 deliverable shape: "event name → payload type" map. */
export interface ServerToClientEvents {
  [SERVER_EVENTS.ROOM_STATE]: RoomStatePayload;
  [SERVER_EVENTS.GAME_TICK]: GameTickPayload;
  [SERVER_EVENTS.PLAYER_JOINED]: PlayerJoinedPayload;
  [SERVER_EVENTS.PLAYER_LEFT]: PlayerLeftPayload;
  [SERVER_EVENTS.ROUND_RESULT]: RoundResultPayload;
  [SERVER_EVENTS.ERROR]: ErrorPayload;
  [SERVER_EVENTS.PONG]: PongPayload;
}
