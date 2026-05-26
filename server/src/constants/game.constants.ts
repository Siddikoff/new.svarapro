export const TURN_DURATION_SECONDS = 15;

// Dealing animation timing — kept in sync with client constants
// (client/src/features/gameRoom/constants.ts and client/src/GameRoom.tsx).
// Each card slides in over DEAL_DURATION_MS, with DEAL_STAGGER_MS between
// consecutive card draws. The first player on the clock only sees the
// timer ring start once the deal animation finishes plus a short pause.
export const DEAL_DURATION_MS = 720;
export const DEAL_STAGGER_MS = 340;
export const CARDS_PER_SEAT = 3;
export const TURN_START_DELAY_MS = 800;

/**
 * How long to wait, in milliseconds, between dealing cards on the server
 * and starting the active player's turn clock. Matches the time the
 * client spends animating cards flying to seats so the first player
 * actually has a full TURN_DURATION_SECONDS to act, not 15s minus the
 * animation duration.
 */
export const getDealAnimationDelayMs = (activePlayerCount: number): number => {
  const totalDeals = CARDS_PER_SEAT * Math.max(0, activePlayerCount);
  if (totalDeals === 0) return TURN_START_DELAY_MS;
  const dealEndMs = (totalDeals - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS;
  return dealEndMs + TURN_START_DELAY_MS;
};
