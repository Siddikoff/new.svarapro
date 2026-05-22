import { useCallback } from 'react';

import { featureFlags } from '../constants/featureFlags';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import type { ThemeName, ThemePref } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import type { RoomMode } from '../store/roomStore';
import { useRoomStore } from '../store/roomStore';
import { MODALS, SCREENS, TOURNAMENT_TABS, useUiStore } from '../store/uiStore';
import type { Room } from '../types/domain';
import { RatingScreen } from './RatingScreen';
import { TournamentDetailsScreen } from './TournamentDetailsScreen';
import { TournamentGameScreen } from './TournamentGameScreen';
import { TournamentsListScreen } from './TournamentsListScreen';

/**
 * Owns "which screen renders right now" given uiStore state.
 *
 * Keeping the routing tree here (rather than in App.jsx) lets App.jsx stay
 * focused on global concerns (theme, telegram chrome, modals manager).
 */
interface ScreenRouterProps {
  themePref: ThemePref;
  activeTheme: ThemeName;
  onSetThemePref: (next: ThemePref) => void;
}

export function ScreenRouter({ themePref, activeTheme, onSetThemePref }: ScreenRouterProps) {
  const activeScreen = useUiStore((state) => state.activeScreen);
  const activeTournament = useUiStore((state) => state.activeTournament);
  const tournamentTab = useUiStore((state) => state.tournamentTab);
  const openModal = useUiStore((state) => state.openModal);

  const user = useAuthStore((state) => state.user);

  const selectRoom = useRoomStore((state) => state.selectRoom);
  const setNeedFundsRoom = useRoomStore((state) => state.setNeedFundsRoom);
  const registerForTournament = useRoomStore((state) => state.registerForTournament);
  const isCurrentTournamentJoined = useRoomStore((state) =>
    activeTournament ? state.joinedTournamentIds.has(activeTournament.id) : false,
  );

  const handleOpenRoom = useCallback(
    (room: Room, mode: RoomMode) => {
      if (mode === 'join' && room && typeof room.bet === 'number' && user.balance < room.bet) {
        setNeedFundsRoom(room);
        return;
      }
      selectRoom(room, mode);
    },
    [user.balance, selectRoom, setNeedFundsRoom],
  );

  const openDeposit = useCallback(() => openModal(MODALS.deposit), [openModal]);
  const openWithdraw = useCallback(() => openModal(MODALS.withdraw), [openModal]);

  const handleToggleTheme = useCallback(() => {
    onSetThemePref(themePref === 'dark' ? 'light' : 'dark');
  }, [onSetThemePref, themePref]);

  if (activeScreen === SCREENS.lobby) {
    return (
      <LobbyScreen
        user={user}
        onDeposit={openDeposit}
        onWithdraw={openWithdraw}
        onRoom={handleOpenRoom}
      />
    );
  }

  // Rating + Tournaments are gated behind feature flags so we can ship
  // them in mock-only mode and turn them off in production until the
  // backend exposes the underlying endpoints. When a flag is off and
  // the screen is selected (e.g. because of stale persisted state) we
  // fall through to the lobby branch below.
  if (activeScreen === SCREENS.rating && featureFlags.ratingEnabled) {
    return <RatingScreen />;
  }

  if (
    activeScreen === SCREENS.tournament &&
    featureFlags.tournamentsEnabled &&
    !activeTournament
  ) {
    return <TournamentsListScreen />;
  }

  if (
    activeScreen === SCREENS.tournament &&
    featureFlags.tournamentsEnabled &&
    activeTournament &&
    tournamentTab === TOURNAMENT_TABS.info
  ) {
    return (
      <TournamentDetailsScreen
        tournament={activeTournament}
        joined={isCurrentTournamentJoined}
        onRegister={() => registerForTournament(activeTournament.id)}
      />
    );
  }

  if (
    activeScreen === SCREENS.tournament &&
    featureFlags.tournamentsEnabled &&
    activeTournament &&
    tournamentTab === TOURNAMENT_TABS.play
  ) {
    return (
      <TournamentGameScreen
        tournament={activeTournament}
        joined={isCurrentTournamentJoined}
        onRegister={() => registerForTournament(activeTournament.id)}
      />
    );
  }

  if (activeScreen === SCREENS.profile) {
    return (
      <ProfileScreen
        user={user}
        onDeposit={openDeposit}
        onWithdraw={openWithdraw}
        theme={activeTheme}
        themePref={themePref}
        onSetThemePref={onSetThemePref}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // Fallback: the active screen is unknown or disabled by a feature
  // flag — render the lobby so the user always has something to interact
  // with instead of staring at a blank app shell.
  return (
    <LobbyScreen
      user={user}
      onDeposit={openDeposit}
      onWithdraw={openWithdraw}
      onRoom={handleOpenRoom}
    />
  );
}
