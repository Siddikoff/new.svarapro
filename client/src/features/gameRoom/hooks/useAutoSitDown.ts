import { useEffect, useRef } from 'react';

import type { SvaraGameState } from '../../../api/svaraGame';
import { sitDown, subscribeToGameState } from '../../../services/gameSocket';
import { getTelegramUser, getTelegramUserId } from '../../../services/telegram';
import { useAuthStore } from '../../../store/authStore';
import { GAME_MODES, type GameMode } from '../../../store/gameStore';
import type { Room } from '../../../types/domain';
import { SEATS_DEFAULT } from '../constants';

const MAX_POSITION = SEATS_DEFAULT.length;

const buildUserData = (): { username: string; avatar: string } => {
  const user = useAuthStore.getState().user;
  const tgUser = getTelegramUser();
  return {
    username:
      user.username ||
      tgUser?.username ||
      tgUser?.first_name ||
      'Player',
    avatar: user.photo || tgUser?.photo_url || '',
  };
};

const firstFreePosition = (state: SvaraGameState): number | null => {
  const taken = new Set<number>(
    (state.players ?? [])
      .map((p) => (typeof p.position === 'number' ? p.position : null))
      .filter((p): p is number => p !== null),
  );
  for (let position = 1; position <= MAX_POSITION; position++) {
    if (!taken.has(position)) return position;
  }
  return null;
};

/**
 * When the user enters a room as `GAME_MODES.join` (created or REST-joined),
 * the server has them in `room.players` but NOT in `gameState.players` until
 * we explicitly emit `sit_down`. Without that the game never starts.
 *
 * This hook waits for the first `game_state` snapshot, finds the first free
 * position 1..6, and emits `sit_down` exactly once per room entry. If the
 * user is already seated (e.g. on reconnect) or all seats are taken, it is
 * a no-op.
 */
export const useAutoSitDown = (
  activeRoom: Room | null | undefined,
  mode: GameMode,
): void => {
  const attemptedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeRoom || mode !== GAME_MODES.join) return undefined;

    const roomId = String(activeRoom.id);
    if (attemptedRoomRef.current === roomId) return undefined;

    const tgId = getTelegramUserId();
    if (tgId === null) return undefined;
    const selfId = String(tgId);

    const unsubscribe = subscribeToGameState((state) => {
      if (attemptedRoomRef.current === roomId) return;

      const alreadySeated = (state.players ?? []).some(
        (p) => String(p.id) === selfId,
      );
      if (alreadySeated) {
        attemptedRoomRef.current = roomId;
        return;
      }

      const position = firstFreePosition(state);
      if (position === null) return;

      attemptedRoomRef.current = roomId;
      sitDown({
        roomId,
        position,
        userData: buildUserData(),
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoom, mode]);

  useEffect(() => {
    if (!activeRoom) attemptedRoomRef.current = null;
  }, [activeRoom]);
};

/**
 * Standalone emit helper for the spectator → player flow. The seat object
 * carries a numeric `id` (1..6) that doubles as the server-side position;
 * for the deferred `{ pos }` shape we look the id up in `SEATS_DEFAULT`.
 *
 * Safe to call even when `room` is null — the call becomes a no-op.
 */
export const seatPlayer = (
  room: Pick<Room, 'id'> | null | undefined,
  seat: { id?: number; pos?: string } | null,
): void => {
  if (!room || !seat) return;
  const fromId = typeof seat.id === 'number' ? seat.id : null;
  const fromPos =
    fromId === null && typeof seat.pos === 'string'
      ? SEATS_DEFAULT.find((s) => s.pos === seat.pos)?.id ?? null
      : null;
  const position = fromId ?? fromPos;
  if (position === null) return;

  sitDown({
    roomId: String(room.id),
    position,
    userData: buildUserData(),
  });
};
