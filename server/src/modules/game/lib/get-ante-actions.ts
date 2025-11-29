import { GameState } from '../../../types/game';

export const getAnteActions = (
  gameState: GameState,
  playerId: string,
): any[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player || !player.isActive) {
    return [];
  }

  const actions: any[] = [];

  if (player.totalBet < gameState.minBet) {
    if (player.balance >= gameState.minBet) {
      actions.push({ type: 'ante', amount: gameState.minBet });
    }
  }

  return actions;
};
