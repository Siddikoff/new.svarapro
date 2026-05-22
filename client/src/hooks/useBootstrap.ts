import { useEffect } from 'react';

import { attachGameSocketBridge, subscribeToBalanceUpdates } from '../services/gameSocket';
import { connectSocket } from '../services/socket';
import { getTelegramUser, getTelegramUserId } from '../services/telegram';
import { useAuthStore } from '../store/authStore';
import { subscribeRoomSocket, useRoomStore } from '../store/roomStore';

/**
 * App bootstrap effect.
 *
 * Runs once on mount. The order matters:
 *   1. Subscribe the lobby `rooms` socket listener so we don't miss
 *      the initial push.
 *   2. Attach the game-room socket bridge (state/chat/sound/error).
 *   3. Kick off Telegram login → JWT → `/users/profile`.
 *   4. Open the socket with JWT + Telegram handshake (`telegramId` +
 *      cosmetic `userData`) so both `RoomsGateway` (JWT) and
 *      `GameGateway` (telegramId in handshake) see what they expect.
 *   5. Subscribe to the balance channel so wallet updates push live.
 *   6. Trigger an initial REST fetch of rooms so the lobby has data
 *      even if the socket connection fails / `VITE_SOCKET_URL` is unset.
 *
 * `connectSocket` and `subscribeRoomSocket` are no-ops when
 * `VITE_SOCKET_URL` is empty, so this hook is safe in dev preview.
 */
export const useBootstrap = (): void => {
  useEffect(() => {
    subscribeRoomSocket();
    const detachGameBridge = attachGameSocketBridge();

    const run = async (): Promise<void> => {
      await useAuthStore.getState().login();
      const token = useAuthStore.getState().token;
      const tgId = getTelegramUserId();
      const tgUser = getTelegramUser();
      connectSocket({
        token,
        telegramId: tgId !== null ? String(tgId) : null,
        userData: tgUser
          ? {
              username: tgUser.username ?? tgUser.first_name ?? 'Unknown',
              avatar: tgUser.photo_url ?? '',
            }
          : null,
      });
      subscribeToBalanceUpdates();
      await useRoomStore.getState().loadRooms();
    };

    void run();

    return () => {
      detachGameBridge();
    };
  }, []);
};
