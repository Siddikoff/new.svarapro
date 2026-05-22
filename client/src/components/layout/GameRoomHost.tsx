import React, { Suspense, useEffect, useState } from 'react';

import type { ThemeName, ThemePref } from '../../hooks/useTheme';
import { exitTelegramFullscreen } from '../../services/telegram';
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
  const activeRoom = useGameStore((state) => state.activeRoom);
  const mode = useGameStore((state) => state.mode);
  const enterRoom = useGameStore((state) => state.enterRoom);
  const exitRoom = useGameStore((state) => state.exitRoom);
  const [waitForNextRound, setWaitForNextRound] = useState(false);

  useEffect(() => {
    if (!activeRoom || mode === GAME_MODES.watch) setWaitForNextRound(false);
  }, [activeRoom, mode]);

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
            onTakeSeat={
              mode === GAME_MODES.watch
                ? () => {
                    setWaitForNextRound(true);
                    enterRoom(activeRoom, GAME_MODES.join);
                  }
                : undefined
            }
            onExit={() => {
              setWaitForNextRound(false);
              exitRoom();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
