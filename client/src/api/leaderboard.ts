/**
 * Leaderboard / ranking API — mock-only.
 *
 * No `/leaderboard` endpoint exists on the svarapro backend yet. This
 * module returns the in-repo fixtures so the v143 rating screen renders
 * as designed; the screen itself is hidden behind the `ratingEnabled`
 * feature flag, so flipping that flag off removes the call sites
 * entirely from the production bundle.
 */
import { MOCK_LEADERBOARD } from '../data/mocks';
import type { LeaderboardEntry } from '../types/domain';

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => MOCK_LEADERBOARD;
