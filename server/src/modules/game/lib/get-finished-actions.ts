import { GameState } from '../../../types/game';

export const getFinishedActions = (
  gameState: GameState,
  playerId: string,
): any[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return [];
  }

  const actions: any[] = [];

  actions.push({ type: 'new_game' });

  // The `cardsVisible` property does not exist on the Player type.
  // The logic to show cards is handled in the `finishGame` function in game-logic.service.
  // This action appears to be redundant or part of a legacy flow.
  // I am removing it to align with the official types.

  return actions;
};
