import React, { Suspense, useCallback, useEffect, useState } from 'react';

import { seatPlayer, useAutoSitDown } from '../../features/gameRoom/hooks/useAutoSitDown';
import type { ThemeName, ThemePref } from '../../hooks/useTheme';
import { exitTelegramFullscreen } from '../../services/telegram';
import { useAuthStore } from '../../store/authStore';
import { GAME_MODES, useGameStore } from '../../store/gameStore';
import { useRoomStore } from '../../store/roomStore';
import { RoomLoader } from '../RoomLoader';

const LazyGameRoom = React.lazy(() => import('../../GameRoom'));

interface GameRoomHostProps {
  activeTheme: ThemeName;
  themePref: ThemePref;
  onSetThemePref: (next: ThemePref) => void;
}

/**
 * Renders the loader sheet while a room is opening and the lazy GameRoom
 * once it's ready. Kept separate from App.jsx so the suspense boundary and
 * lazy import don't pollute the top-level layout.
 */
export function GameRoomHost({ activeTheme, themePref, onSetThemePref }: GameRoomHostProps) {
  const roomLoaderTarget = useRoomStore((state) => state.roomLoaderTarget);
  const roomLoaderCreating = useRoomStore((state) => state.roomLoaderCreating);
  const setNeedFundsRoom = useRoomStore((state) => state.setNeedFundsRoom);
  const activeRoom = useGameStore((state) => state.activeRoom);
  const mode = useGameStore((state) => state.mode);
  const enterRoom = useGameStore((state) => state.enterRoom);
  const exitRoom = useGameStore((state) => state.exitRoom);
  const [waitForNextRound, setWaitForNextRound] = useState(false);

  useEffect(() => {
    if (!activeRoom || mode === GAME_MODES.watch) setWaitForNextRound(false);
  }, [activeRoom, mode]);

  // Mode=join means the user has REST-joined the room (or just created it).
  // The server only adds them to `gameState.players` after a `sit_down` event,
  // so auto-sit them on the first free position when the snapshot arrives.
  useAutoSitDown(activeRoom, mode);

  const handleTakeSeat = useCallback(
    (seat: { id?: number; pos?: string } | null) => {
      if (!activeRoom) return;
      // Original (`Siddikoff/svarapro`) blocks the sit-down when the
      // balance can't cover ten rounds at the table's minimum bet:
      // `parseFloat(balance) < gameState.minBet * 10`. Without this
      // guard a spectator with $0 can request a seat, the server
      // bounces the `sit_down` emit, and the user is left staring at
      // the table with no feedback. We surface the existing
      // InsufficientFundsModal (rendered by `ModalsManager`) so they
      // can top up first.
      const MIN_BALANCE_MULTIPLIER = 10;
      const balance = useAuthStore.getState().user.balance;
      const requiredBalance = activeRoom.bet * MIN_BALANCE_MULTIPLIER;
      if (balance < requiredBalance) {
        setNeedFundsRoom(activeRoom, requiredBalance);
        return;
      }
      seatPlayer(activeRoom, seat);
      setWaitForNextRound(true);
      if (mode === GAME_MODES.watch) {
        enterRoom(activeRoom, GAME_MODES.join);
      }
    },
    [activeRoom, mode, enterRoom, setNeedFundsRoom],
  );

  // Exit Telegram fullscreen once both the loader and active room are gone.
  // Entering fullscreen is owned by RoomLoader's mount effect, which defers
  // the request so the entry animation is visible before the viewport
  // expands (without that delay the screen jumps to fullscreen on tap,
  // before any animation appears).
  useEffect(() => {
    if (!activeRoom && !roomLoaderTarget) {
      exitTelegramFullscreen();
    }
  }, [activeRoom, roomLoaderTarget]);

  // Memoised so `GameRoom` -> `useTgBackButton` sees a stable reference
  // across renders. Without this the hook's effect re-ran on every
  // GameRoom render (timers, animation state…), flickering the Telegram
  // BackButton hide/show and exposing the WebApp's default close-X icon
  // between renders.
  const handleExit = useCallback(() => {
    setWaitForNextRound(false);
    exitRoom();
  }, [exitRoom]);

  return (
    <>
      {roomLoaderTarget && (
        <RoomLoader room={roomLoaderTarget} theme={activeTheme} creating={roomLoaderCreating} />
      )}
      {activeRoom && (
        <Suspense fallback={<RoomLoader room={activeRoom} theme={activeTheme} />}>
          <LazyGameRoom
            room={activeRoom}
            theme={activeTheme}
            themePref={themePref}
            onSetThemePref={onSetThemePref}
            spectator={mode === GAME_MODES.watch}
            waitForNextRound={waitForNextRound}
            onTakeSeat={mode === GAME_MODES.watch ? handleTakeSeat : undefined}
            onExit={handleExit}
          />
        </Suspense>
      )}
    </>
  );
}
