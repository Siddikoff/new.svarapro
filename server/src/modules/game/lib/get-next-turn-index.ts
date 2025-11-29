import { Player } from '../../../types/game';

export const getNextTurnIndex = (
  players: Player[],
  currentIndex: number,
  skipInactive = true,
): number => {
  if (players.length === 0) {
    return -1;
  }

  // Start searching from the player after the current one.
  for (let i = 1; i <= players.length; i++) {
    const nextIndex = (currentIndex + i) % players.length;
    const nextPlayer = players[nextIndex];

    if (skipInactive) {
      if (nextPlayer.isActive && !nextPlayer.hasFolded) {
        return nextIndex;
      }
    } else {
      // If we don't skip inactive, just return the next player in line.
      return nextIndex;
    }
  }

  return -1; // Should only be reached if all players are inactive
};
