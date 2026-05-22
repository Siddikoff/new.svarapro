/**
 * Canonical names of every event the client can send to the server.
 *
 * Mirrors `SERVER_EVENTS` on the inbound side. Adding a flow:
 *   1. Add the name here.
 *   2. Add the payload schema in `payloads.ts`.
 *   3. Add a `case` to `ClientFrameSchema`.
 *   4. Use `wsClient.send(CLIENT_EVENTS.X, payload)` from features.
 */
export const CLIENT_EVENTS = {
  AUTH: 'auth',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  PLACE_BET: 'game:bet',
  CHAT_MESSAGE: 'chat:send',
  PING: 'ping',
  REQUEST_SNAPSHOT: 'room:request_snapshot',
} as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
