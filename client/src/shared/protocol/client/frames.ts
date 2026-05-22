/**
 * Client → server envelope.  Symmetric to `ServerFrameSchema`.
 *
 * Use `parseClientFrame` mainly for tests or when the server replays a
 * client frame back (e.g. in chat echo). Real production sends rely on
 * TypeScript at the call site via `ClientToServerEvents`.
 */
import { z } from 'zod';

import { CLIENT_EVENTS } from './events';
import {
  type AuthPayload,
  AuthPayloadSchema,
  type ChatMessagePayload,
  ChatMessagePayloadSchema,
  type JoinRoomPayload,
  JoinRoomPayloadSchema,
  type LeaveRoomPayload,
  LeaveRoomPayloadSchema,
  type PingPayload,
  PingPayloadSchema,
  type PlaceBetPayload,
  PlaceBetPayloadSchema,
  type RequestSnapshotPayload,
  RequestSnapshotPayloadSchema,
} from './payloads';

export const ClientFrameSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(CLIENT_EVENTS.AUTH), payload: AuthPayloadSchema }),
  z.object({ type: z.literal(CLIENT_EVENTS.JOIN_ROOM), payload: JoinRoomPayloadSchema }),
  z.object({ type: z.literal(CLIENT_EVENTS.LEAVE_ROOM), payload: LeaveRoomPayloadSchema }),
  z.object({ type: z.literal(CLIENT_EVENTS.PLACE_BET), payload: PlaceBetPayloadSchema }),
  z.object({ type: z.literal(CLIENT_EVENTS.CHAT_MESSAGE), payload: ChatMessagePayloadSchema }),
  z.object({ type: z.literal(CLIENT_EVENTS.PING), payload: PingPayloadSchema }),
  z.object({
    type: z.literal(CLIENT_EVENTS.REQUEST_SNAPSHOT),
    payload: RequestSnapshotPayloadSchema,
  }),
]);
export type ClientFrame = z.infer<typeof ClientFrameSchema>;

export interface ClientToServerEvents {
  [CLIENT_EVENTS.AUTH]: AuthPayload;
  [CLIENT_EVENTS.JOIN_ROOM]: JoinRoomPayload;
  [CLIENT_EVENTS.LEAVE_ROOM]: LeaveRoomPayload;
  [CLIENT_EVENTS.PLACE_BET]: PlaceBetPayload;
  [CLIENT_EVENTS.CHAT_MESSAGE]: ChatMessagePayload;
  [CLIENT_EVENTS.PING]: PingPayload;
  [CLIENT_EVENTS.REQUEST_SNAPSHOT]: RequestSnapshotPayload;
}
