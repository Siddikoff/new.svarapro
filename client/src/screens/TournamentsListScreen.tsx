import { useEffect, useMemo, useState } from 'react';

import { fetchTournaments } from '../api/tournaments';
import { TournamentCard } from '../components/TournamentCard';
import { SectionHeader } from '../components/ui/SectionHeader';
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
 * Tournament list — loads from `api/tournaments.ts`.
 *
 * The backend currently has no `/tournaments` endpoint so the API layer
 * still returns fixtures. In production this whole tree is gated off via
 * `VITE_FEATURE_TOURNAMENTS=0`, so the fixtures don't leak into the
 * bundle until the real endpoint exists.
 */
export function TournamentsListScreen() {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);

  const setTournamentTab = useUiStore((state) => state.setTournamentTab);
  const setActiveTournament = useUiStore((state) => state.setActiveTournament);

  const joinedTournamentIds = useRoomStore((state) => state.joinedTournamentIds);
  const registerForTournament = useRoomStore((state) => state.registerForTournament);

  useEffect(() => {
    let cancelled = false;
    void fetchTournaments().then((rows) => {
      if (!cancelled) setTournaments(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = useMemo(
    () =>
      tournaments?.filter((tournament) => tournament.status === 'active').length ?? 0,
    [tournaments],
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
        {(tournaments ?? []).map((tournament: Tournament) => {
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
