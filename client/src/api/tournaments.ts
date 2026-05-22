/**
 * Tournaments API — mock-only.
 *
 * The svarapro backend currently exposes nothing for tournaments
 * (no `/tournaments`, no `/tournaments/:id/register`), so this module
 * always returns the in-repo fixtures. The whole tournaments section
 * is gated behind the `tournamentsEnabled` feature flag, so when it's
 * off the entire UI tree and these calls become unreachable / tree-
 * shaken from the production bundle.
 *
 * Once the server endpoints exist, the implementation can route
 * through `httpRequest` with an `apiConfigured()` guard — mirroring
 * the pattern used in `api/rooms.ts` and `api/payments.ts` — and keep
 * the mock branch as the offline fallback.
 */
import { MOCK_TOURNAMENT_LEADERBOARD, MOCK_TOURNAMENTS } from '../data/mocks';
import type { Tournament, TournamentLeaderboardEntry } from '../types/domain';

export const fetchTournaments = async (): Promise<Tournament[]> => MOCK_TOURNAMENTS;

export const fetchTournamentLeaderboard = async (): Promise<TournamentLeaderboardEntry[]> =>
  MOCK_TOURNAMENT_LEADERBOARD;

export const registerForTournament = async (
  _tournamentId: number,
): Promise<{ ok: true }> => ({
  ok: true,
});
