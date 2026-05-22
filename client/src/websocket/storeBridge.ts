/**
 * Bridge between the WebSocket client and the zustand stores.
 *
 * The bridge subscribes to every server-pushed event in
 * `src/shared/protocol/server` and routes the validated payload to the
 * right slice. Frames are validated by `wsClient` before reaching the
 * listener, so reducers never see malformed data.
 *
 * Usage (from `main.jsx`):
 *   import { wsClient, attachStoreBridge } from './websocket';
 *   const detach = attachStoreBridge();
 *   wsClient.connect();
 *   // detach() in HMR/teardown if needed.
 *
 * Adding a new event:
 *   1. Add the constant to `shared/protocol/server/events.ts`.
 *   2. Add the payload schema in `shared/protocol/server/payloads.ts`.
 *   3. Add a discriminated-union arm in `shared/protocol/server/frames.ts`.
 *   4. Add a `wsClient.on(...)` line here mapping it to a store action.
 *   5. Add the reducer to the slice in `store/`.
 */
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/protocol';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import type { WsUnsubscribe } from './client';
import { wsClient } from './client';

/**
 * Subscribes to all inbound events and routes them to the right slice.
 * Returns a cleanup function that removes every listener.
 *
 * Realtime safety:
 *   - Snapshots / ticks with stale `version` are dropped inside the
 *     reducer; this bridge just forwards.
 *   - Server `ERROR` frames are surfaced as toasts so the user sees
 *     why an action failed.
 *   - `PONG` replies update RTT/staleness in `connectionStore` via
 *     `wsClient.notifyPong(t)`.
 *   - On `reconnect` the bridge requests a fresh `RoomState` snapshot
 *     for the currently active room \u2014 catching up on whatever happened
 *     while the socket was down.
 */
export function attachStoreBridge(): () => void {
  let pendingRollback: (() => void) | null = null;

  const offs: WsUnsubscribe[] = [
    wsClient.on(SERVER_EVENTS.ROOM_STATE, (payload) =>
      useGameStore.getState().applySnapshot(payload),
    ),

    wsClient.on(SERVER_EVENTS.GAME_TICK, (payload) => {
      const before = useGameStore.getState();
      useGameStore.getState().applyTick(payload);
      const after = useGameStore.getState();
      // If the tick was rejected for a *version mismatch* (not just an
      // out-of-order `t` within the same version), request a snapshot
      // resync. We can tell the two apart because a version mismatch
      // leaves `state.version` unchanged but the tick carried a
      // different version field.
      const wasVersionMismatch =
        typeof payload.version === 'number' &&
        payload.version !== before.version &&
        after.version === before.version;
      if (wasVersionMismatch) {
        const room = after.activeRoom;
        if (room) {
          wsClient.send(CLIENT_EVENTS.REQUEST_SNAPSHOT, {
            roomId: room.id,
            sinceVersion: before.version,
          });
        }
      }
    }),

    wsClient.on(SERVER_EVENTS.PLAYER_JOINED, (payload) =>
      useGameStore.getState().applyPlayerJoined(payload),
    ),
    wsClient.on(SERVER_EVENTS.PLAYER_LEFT, (payload) =>
      useGameStore.getState().applyPlayerLeft(payload),
    ),

    wsClient.on(SERVER_EVENTS.ROUND_RESULT, (payload) => {
      useGameStore.getState().applyRoundResult(payload);
      const delta = payload.balanceDelta;
      if (typeof delta === 'number') {
        if (delta > 0) pendingRollback = useAuthStore.getState().creditBalance(delta);
        else if (delta < 0) pendingRollback = useAuthStore.getState().debitBalance(-delta);
      }
    }),

    wsClient.on(SERVER_EVENTS.ERROR, (payload) => {
      pendingRollback?.();
      pendingRollback = null;
      useToastStore.getState().pushToast({ tone: 'error', message: payload.message });
      if (typeof console !== 'undefined') console.warn('[ws] server error', payload);
    }),

    wsClient.on(SERVER_EVENTS.PONG, (payload) => {
      // Cancel the dead-socket timer and record RTT.
      wsClient.notifyPong(payload.t);
    }),

    // On reconnect, fetch a fresh snapshot for the active room so the UI
    // catches up on anything that happened while the socket was down.
    wsClient.onLifecycle('reconnect', () => {
      const room = useGameStore.getState().activeRoom;
      if (!room) return;
      wsClient.send(CLIENT_EVENTS.REQUEST_SNAPSHOT, {
        roomId: room.id,
        sinceVersion: useGameStore.getState().version,
      });
    }),
  ];

  return () => offs.forEach((off) => off?.());
}
