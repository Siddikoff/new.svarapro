/**
 * `shared/protocol` — single source of truth for everything that travels
 * between client and server: WebSocket event names, payload shapes, and
 * runtime validation.
 *
 * Layout:
 *   - `shared/`  common primitive schemas (Card, Seat, Money, IDs, ...)
 *   - `server/`  server → client events (`ServerToClientEvents`)
 *   - `client/`  client → server events (`ClientToServerEvents`)
 *
 * Validation entry points:
 *   - `parseServerFrame(raw)`  parse one inbound WS frame
 *   - `parseClientFrame(raw)`  parse one outbound WS frame (mainly tests)
 *   - `validateApiResponse(schema, raw)` validate REST responses
 *
 * Stage-2 contract: every payload that crosses the boundary is checked
 * at runtime. Malformed frames are dropped before they reach any store.
 */
import { z, type ZodError,type ZodTypeAny } from 'zod';

import { type ClientFrame,ClientFrameSchema } from './client';
import { type ServerFrame,ServerFrameSchema } from './server';

export * from './api';
export * from './client';
export * from './server';
export * from './shared';

export type ProtocolParseResult<T> =
  | { ok: true; frame: T }
  | { ok: false; error: ZodError };

const _parseFrame = <T>(schema: ZodTypeAny, raw: unknown): ProtocolParseResult<T> => {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, frame: result.data as T };
  return { ok: false, error: result.error };
};

/** Parse one inbound WebSocket frame. */
export const parseServerFrame = (raw: unknown): ProtocolParseResult<ServerFrame> =>
  _parseFrame<ServerFrame>(ServerFrameSchema, raw);

/** Parse one outbound WebSocket frame. */
export const parseClientFrame = (raw: unknown): ProtocolParseResult<ClientFrame> =>
  _parseFrame<ClientFrame>(ClientFrameSchema, raw);

export type ApiValidationResult<T> = { ok: true; data: T } | { ok: false; error: ZodError };

/**
 * Validate a REST response against a Zod schema. Mirrors the WS frame
 * parser shape so callers can branch on the same `ok` discriminator.
 */
export const validateApiResponse = <T>(
  schema: z.ZodType<T>,
  raw: unknown,
): ApiValidationResult<T> => {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
};

/**
 * Unified event-name catalogue mirroring the legacy `WS_EVENTS` map
 * in `websocket/events.ts`.  Keeping a single object means components
 * still importing from `websocket/events` keep working unchanged.
 */
export const WS_EVENTS = {
  AUTH: 'auth',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  PLACE_BET: 'game:bet',
  CHAT_MESSAGE: 'chat:send',
  PING: 'ping',
  REQUEST_SNAPSHOT: 'room:request_snapshot',
  ROOM_STATE: 'room:state',
  GAME_TICK: 'game:tick',
  PLAYER_JOINED: 'room:player_joined',
  PLAYER_LEFT: 'room:player_left',
  ROUND_RESULT: 'game:round_result',
  ERROR: 'error',
  PONG: 'pong',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
