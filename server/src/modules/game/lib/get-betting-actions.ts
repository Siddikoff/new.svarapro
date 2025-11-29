import { GameState } from '../../../types/game';
import { getAmountToCall, getMinRaise, getMaxRaise } from './betting-utils';

export const getBettingActions = (
  gameState: GameState,
  playerId: string,
): any[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player || !player.isActive) {
    return [];
  }

  const actions: any[] = [];
  const amountToCall = getAmountToCall(gameState, playerId);

  actions.push({ type: 'fold' });

  if (amountToCall > 0) {
    if (player.balance > amountToCall) {
      actions.push({ type: 'call', amount: amountToCall });
    }
  } else {
    actions.push({ type: 'check' });
  }

  const minRaise = getMinRaise(gameState);
  const maxRaise = getMaxRaise(gameState, playerId);
  
  console.log(`[RAISE_MAX_DEBUG] getBettingActions for player ${playerId}: hasRaiseMax=${gameState.hasRaiseMax}, maxRaise=${maxRaise}`);

  if (maxRaise > 0) {
    actions.push({
      type: 'raise',
      min: Math.min(minRaise, maxRaise),
      max: maxRaise,
      step: gameState.minBet,
    });
  }

  return actions;
};