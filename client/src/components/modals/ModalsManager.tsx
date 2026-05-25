import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';

import { ROOM_LOADER_DELAY_MS } from '../../constants/app';
import { useAuthStore } from '../../store/authStore';
import { GAME_MODES, type GameMode,useGameStore } from '../../store/gameStore';
import { useRoomStore } from '../../store/roomStore';
import { MODALS, SCREENS, useUiStore } from '../../store/uiStore';
import type { Room } from '../../types/domain';
import { InsufficientFundsModal } from './InsufficientFundsModal';

// Heavy, user-triggered modals are code-split so the initial bundle
// doesn't pay for them. Each chunk is named so it shows up in the build
// report under its own filename. They render as the named exports the
// original modules expose; React.lazy needs a default export so we wrap.
//
// The raw `import()` functions are kept as named loaders so we can warm
// them on idle below — by the time the user taps a button, the chunk
// is already in the cache and Suspense resolves synchronously instead
// of waiting on a network round-trip.
const loadCreateRoomModal = () => import('../../modals/CreateRoomModal');
const loadDepositModal = () => import('../../features/deposit/DepositModal');
const loadJoinByCodeModal = () => import('../../modals/JoinByCodeModal');
const loadRoomDetailsModal = () => import('../../modals/RoomDetailsModal');
const loadStartGameSheet = () => import('../../modals/StartGameSheet');
const loadWithdrawModal = () => import('../../modals/WithdrawModal');

const CreateRoomModal = lazy(() =>
  loadCreateRoomModal().then((m) => ({ default: m.CreateRoomModal })),
);
const DepositModal = lazy(() =>
  loadDepositModal().then((m) => ({ default: m.DepositModal })),
);
const JoinByCodeModal = lazy(() =>
  loadJoinByCodeModal().then((m) => ({ default: m.JoinByCodeModal })),
);
const RoomDetailsModal = lazy(() =>
  loadRoomDetailsModal().then((m) => ({ default: m.RoomDetailsModal })),
);
const StartGameSheet = lazy(() =>
  loadStartGameSheet().then((m) => ({ default: m.StartGameSheet })),
);
const WithdrawModal = lazy(() =>
  loadWithdrawModal().then((m) => ({ default: m.WithdrawModal })),
);

const preloadGameRoom = () => import('../../GameRoom');

// Window-typed idle-callback signatures. Safari < 16.4 doesn't ship
// requestIdleCallback, so we fall back to setTimeout(0) to keep the
// preload off the critical path without blocking initial paint.
type IdleHandle = number;
type IdleSchedule = (cb: () => void) => IdleHandle;
type IdleCancel = (handle: IdleHandle) => void;
const scheduleIdle: IdleSchedule =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => (window as unknown as {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => window.setTimeout(cb, 0);
const cancelIdle: IdleCancel =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? (handle) =>
        (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(
          handle,
        )
    : (handle) => window.clearTimeout(handle);

/**
 * Owns every top-level modal/sheet plus the "selected room → enter game"
 * flow. Lives near App.jsx (rather than inside it) so App.jsx stays a thin
 * shell.
 */
export function ModalsManager() {
  const activeModal = useUiStore((state) => state.activeModal);
  const openModal = useUiStore((state) => state.openModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const setActiveScreen = useUiStore((state) => state.setActiveScreen);

  const user = useAuthStore((state) => state.user);
  const creditBalance = useAuthStore((state) => state.creditBalance);
  const debitBalance = useAuthStore((state) => state.debitBalance);

  const selectedRoom = useRoomStore((state) => state.selectedRoom);
  const selectedRoomMode = useRoomStore((state) => state.selectedRoomMode);
  const clearSelectedRoom = useRoomStore((state) => state.clearSelectedRoom);
  const needFundsRoom = useRoomStore((state) => state.needFundsRoom);
  const needFundsRequiredBalance = useRoomStore(
    (state) => state.needFundsRequiredBalance,
  );
  const setNeedFundsRoom = useRoomStore((state) => state.setNeedFundsRoom);
  const clearNeedFundsRoom = useRoomStore((state) => state.clearNeedFundsRoom);
  const showRoomLoader = useRoomStore((state) => state.showRoomLoader);
  const hideRoomLoader = useRoomStore((state) => state.hideRoomLoader);
  const addRoom = useRoomStore((state) => state.addRoom);

  const enterRoom = useGameStore((state) => state.enterRoom);

  // Track the pending "enter game after loader" timer so we can cancel it if
  // the user closes the loader / navigates away before it fires. Without this
  // they could exit the lobby and still get yanked into the game 1.8s later.
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    },
    [],
  );

  // Warm every lazy modal chunk during idle time after mount. Each chunk is
  // tiny (≤12 kB gz) but on a cold cellular cache the first tap on
  // "Пополнить" / "Вывести" / "Создать" pays a full network round-trip
  // before Suspense can resolve, which the user sees as a noticeable lag.
  // Idle-scheduling keeps the warm-up off the critical path so the initial
  // lobby paint isn't delayed; once cached, future taps render instantly.
  useEffect(() => {
    const handle = scheduleIdle(() => {
      void loadCreateRoomModal().catch(() => {});
      void loadDepositModal().catch(() => {});
      void loadJoinByCodeModal().catch(() => {});
      void loadRoomDetailsModal().catch(() => {});
      void loadStartGameSheet().catch(() => {});
      void loadWithdrawModal().catch(() => {});
    });
    return () => cancelIdle(handle);
  }, []);

  const scheduleEnterRoom = useCallback(
    (room: Room, mode: GameMode) => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      enterTimerRef.current = setTimeout(() => {
        enterTimerRef.current = null;
        hideRoomLoader();
        enterRoom(room, mode);
      }, ROOM_LOADER_DELAY_MS);
    },
    [hideRoomLoader, enterRoom],
  );

  const handleEnterSelectedRoom = useCallback(() => {
    if (!selectedRoom) return;

    if (selectedRoomMode === 'join' && user.balance < selectedRoom.bet) {
      const target = selectedRoom;
      clearSelectedRoom();
      setNeedFundsRoom(target);
      return;
    }

    const target = selectedRoom;
    const mode = selectedRoomMode === 'watch' ? GAME_MODES.watch : GAME_MODES.join;

    preloadGameRoom();
    showRoomLoader(target);
    clearSelectedRoom();
    scheduleEnterRoom(target, mode);
  }, [
    selectedRoom,
    selectedRoomMode,
    user.balance,
    clearSelectedRoom,
    setNeedFundsRoom,
    showRoomLoader,
    scheduleEnterRoom,
  ]);

  // No loader UI inside Suspense — modals are fast to load over Telegram's
  // CDN and rendering an extra spinner just to swap to the real one would
  // flicker. The conditional rendering keeps these unmounted until needed.
  return (
    <Suspense fallback={null}>
      {activeModal === MODALS.action && (
        <StartGameSheet
          onClose={closeModal}
          onCreate={() => openModal(MODALS.create)}
          onJoin={() => openModal(MODALS.join)}
        />
      )}

      {activeModal === MODALS.deposit && (
        <DepositModal onClose={closeModal} onDeposited={creditBalance} />
      )}

      {activeModal === MODALS.withdraw && (
        <WithdrawModal
          key={user.balance}
          onClose={closeModal}
          balance={user.balance}
          onWithdrawn={debitBalance}
        />
      )}

      {activeModal === MODALS.create && (
        <CreateRoomModal
          onClose={closeModal}
          onBack={() => openModal(MODALS.action)}
          onCreate={(room) => {
            preloadGameRoom();
            addRoom(room);
            showRoomLoader(room, true);
            scheduleEnterRoom(room, GAME_MODES.join);
          }}
        />
      )}

      {activeModal === MODALS.join && (
        <JoinByCodeModal
          onClose={() => {
            closeModal();
            setActiveScreen(SCREENS.lobby);
          }}
          onBack={() => openModal(MODALS.action)}
          onJoin={(room) => {
            // The server already added the user to the room (or to the
            // spectator list when it's full), so we head straight into
            // the game shell. `addRoom` keeps the lobby list in sync
            // for the brief window before the rooms socket re-broadcasts.
            preloadGameRoom();
            addRoom(room);
            showRoomLoader(room);
            scheduleEnterRoom(room, GAME_MODES.join);
          }}
        />
      )}

      {selectedRoom !== null && (
        <RoomDetailsModal
          room={selectedRoom}
          mode={selectedRoomMode}
          onClose={clearSelectedRoom}
          userBalance={user.balance}
          onEnter={handleEnterSelectedRoom}
        />
      )}

      {needFundsRoom && (
        <InsufficientFundsModal
          balance={user.balance}
          requiredBet={needFundsRequiredBalance || needFundsRoom.bet}
          onClose={clearNeedFundsRoom}
          onDeposit={() => {
            clearNeedFundsRoom();
            openModal(MODALS.deposit);
          }}
        />
      )}
    </Suspense>
  );
}
