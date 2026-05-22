import { useMemo } from 'react';

import { TournamentCard } from '../components/TournamentCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { MOCK_TOURNAMENTS } from '../data/mocks';
import { SPACING } from '../designSystem';
import { useRoomStore } from '../store/roomStore';
import { TOURNAMENT_TABS, useUiStore } from '../store/uiStore';
import type { Tournament } from '../types/domain';

const listStyle : React.CSSProperties = {
  padding: '0 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xl,
};

/**
 * Tournament list — extracted from the inline JSX block in the old App.jsx.
 * Pulls registration state directly from `roomStore` so children stay dumb.
 */
export function TournamentsListScreen() {
  const setTournamentTab = useUiStore((state) => state.setTournamentTab);
  const setActiveTournament = useUiStore((state) => state.setActiveTournament);

  const joinedTournamentIds = useRoomStore((state) => state.joinedTournamentIds);
  const registerForTournament = useRoomStore((state) => state.registerForTournament);

  const activeCount = useMemo(
    () => MOCK_TOURNAMENTS.filter((tournament: Tournament) => tournament.status === 'active').length,
    [],
  );

  return (
    <div style={{ paddingBottom: SPACING.xl } as React.CSSProperties}>
      <SectionHeader
        title="Турниры"
        label="Активные сейчас"
        accent="#a78bfa"
        count={String(activeCount)}
        countLabel="активных"
      />
      <div style={listStyle}>
        {MOCK_TOURNAMENTS.map((tournament: Tournament) => {
          const isJoined = joinedTournamentIds.has(tournament.id);
          return (
            <TournamentCard
              key={tournament.id}
              t={tournament}
              joined={isJoined}
              onRegister={registerForTournament}
              onJoin={() => {
                setTournamentTab(TOURNAMENT_TABS.play);
                setActiveTournament(tournament);
              }}
              onDetails={() => {
                // Joined users see the leaderboard/podium first (TOURNAMENT_TABS.info → TournamentDetailsScreen);
                // non-joined users land on the rules/how-to view (TOURNAMENT_TABS.play → TournamentGameScreen).
                setTournamentTab(isJoined ? TOURNAMENT_TABS.info : TOURNAMENT_TABS.play);
                setActiveTournament(tournament);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
