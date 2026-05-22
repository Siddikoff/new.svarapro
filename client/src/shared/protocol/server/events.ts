/**
 * Canonical names of every event the server can push to the client.
 *
 * Keep this enum in sync with the backend. Adding a new event flow:
 *   1. Add the name here.
 *   2. Add the matching payload schema in `payloads.ts`.
 *   3. Add a `case` to `ServerFrameSchema` in `frames.ts`.
 *   4. Wire the store reducer in `websocket/storeBridge.ts`.
 */
export const SERVER_EVENTS = {
  ROOM_STATE: 'room:state',
  GAME_TICK: 'game:tick',
  PLAYER_JOINED: 'room:player_joined',
  PLAYER_LEFT: 'room:player_left',
  ROUND_RESULT: 'game:round_result',
  ERROR: 'error',
  PONG: 'pong',
} as const;

export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
