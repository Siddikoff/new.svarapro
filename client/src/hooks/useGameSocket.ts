import { useEffect } from 'react';

import { joinGameRoom, leaveGameRoom } from '../services/gameSocket';
import { onSocketConnect } from '../services/socket';
import { useGameStore } from '../store/gameStore';

/**
 * Tie the game-room socket lifecycle to the active room in `gameStore`.
 *
 * - When the user enters a room (`activeRoom` becomes non-null), emit
 *   `join_room` so the svarapro GameGateway adds the socket to that
 *   room channel and sends back the initial `game_state` snapshot.
 * - The `join_room` emit is registered via `onSocketConnect` so it
 *   re-fires on every reconnect: the GameGateway's `handleDisconnect`
 *   actively removes the player from `room.players`, so without the
 *   re-emit the player is silently absent after any transport blip
 *   (and `game_update` broadcasts stop reaching them). The hook fires
 *   immediately when the socket is already open, preserving the
 *   original behaviour for the first connect.
 * - On unmount or when the user exits the room, emit `leave_room`,
 *   detach the reconnect callback, and reset the realtime slice so
 *   the next room boots clean.
 *
 * Composed into the top-level `App` so the listeners are attached for
 * the lifetime of the session. The bridge itself (event → store) is
 * wired up separately in `useBootstrap` via `attachGameSocketBridge`.
 */
export const useGameSocket = (): void => {
  const activeRoom = useGameStore((s) => s.activeRoom);

  useEffect(() => {
    if (!activeRoom) return;
    const roomId = String(activeRoom.id);
    const detachReconnect = onSocketConnect(() => joinGameRoom(roomId));
    return () => {
      detachReconnect();
      leaveGameRoom(roomId);
      useGameStore.getState().resetRealtime();
    };
  }, [activeRoom]);
};
