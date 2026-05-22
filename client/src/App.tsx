import { useCallback } from 'react';

import { ConnectionStatus } from './components/ConnectionStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameRoomHost } from './components/layout/GameRoomHost';
import { NavigationBar } from './components/layout/NavigationBar';
import { RootLayout } from './components/layout/RootLayout';
import { ModalsManager } from './components/modals/ModalsManager';
import { SplashScreen } from './components/SplashScreen';
import { ToastViewport } from './components/ToastViewport';
import { useBackButton } from './hooks/useBackButton';
import { useBootstrap } from './hooks/useBootstrap';
import { useGameSocket } from './hooks/useGameSocket';
import { useScrollToTopOn } from './hooks/useScrollToTopOn';
import { useTelegram } from './hooks/useTelegram';
import { useTheme } from './hooks/useTheme';
import { ScreenRouter } from './screens/ScreenRouter';
import { hapticTap } from './services/haptics';
import { useGameStore } from './store/gameStore';
import { SCREENS, TOURNAMENT_TABS, useUiStore } from './store/uiStore';

/**
 * Top-level shell.
 *
 * Responsibilities are intentionally limited:
 *   - Initialise the Telegram WebApp shell once.
 *   - Own the theme preference / active theme.
 *   - Wire the Telegram BackButton when we're deep inside a tournament.
 *   - Render the layout, current screen, modal manager and lazy GameRoom.
 *
 * Everything else (data, navigation state, room state, game state, services)
 * lives in stores, hooks and dedicated components.
 */
function App() {
  useTelegram();
  useBootstrap();
  useGameSocket();
  const { themePref, activeTheme, setThemePref } = useTheme();

  const isSplashVisible = useUiStore((state) => state.isSplashVisible);
  const hideSplash = useUiStore((state) => state.hideSplash);
  const activeScreen = useUiStore((state) => state.activeScreen);
  const activeTournament = useUiStore((state) => state.activeTournament);
  const tournamentTab = useUiStore((state) => state.tournamentTab);
  const setActiveTournament = useUiStore((state) => state.setActiveTournament);

  const isGameRoomOpen = useGameStore((state) => Boolean(state.activeRoom));

  // Scroll back to top whenever the user navigates to a new screen / tournament view.
  useScrollToTopOn([activeScreen, activeTournament, tournamentTab]);

  const inTournamentDetail =
    activeScreen === SCREENS.tournament &&
    activeTournament &&
    (tournamentTab === TOURNAMENT_TABS.info || tournamentTab === TOURNAMENT_TABS.play);

  const handleBack = useCallback(() => {
    hapticTap();
    setActiveTournament(null);
  }, [setActiveTournament]);

  useBackButton(Boolean(inTournamentDetail) && !isGameRoomOpen, handleBack);

  const handleThemeChange = useCallback(
    (next: 'system' | 'light' | 'dark') => {
      hapticTap();
      setThemePref(next);
    },
    [setThemePref],
  );

  return (
    <RootLayout>
      {isSplashVisible && <SplashScreen onDone={hideSplash} />}

      {!isSplashVisible && (
        <>
          <ErrorBoundary>
            <ScreenRouter
              themePref={themePref}
              activeTheme={activeTheme}
              onSetThemePref={handleThemeChange}
            />
          </ErrorBoundary>
          <NavigationBar />
        </>
      )}

      <ModalsManager />
      <ErrorBoundary>
        <GameRoomHost
          activeTheme={activeTheme}
          themePref={themePref}
          onSetThemePref={handleThemeChange}
        />
      </ErrorBoundary>
      <ConnectionStatus />
      <ToastViewport />
    </RootLayout>
  );
}

export default App;
