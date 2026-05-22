import { useEffect } from 'react';

import { joinGameRoom, leaveGameRoom } from '../services/gameSocket';
import { useGameStore } from '../store/gameStore';

/**
 * Tie the game-room socket lifecycle to the active room in `gameStore`.
 *
 * - When the user enters a room (`activeRoom` becomes non-null), emit
 *   `join_room` so the svarapro GameGateway adds the socket to that
 *   room channel and sends back the initial `game_state` snapshot.
 * - On unmount or when the user exits the room, emit `leave_room` and
 *   reset the realtime slice so the next room boots clean.
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
    joinGameRoom(roomId);
    return () => {
      leaveGameRoom(roomId);
      useGameStore.getState().resetRealtime();
    };
  }, [activeRoom]);
};
