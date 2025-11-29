import { GameState } from '../../../types/game';
import { getAmountToCall, getMinRaise, getMaxRaise } from './betting-utils';

export const getBlindBettingActions = (
  gameState: GameState,
  playerId: string,
): any[] => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player || !player.isActive) {
    return [];
  }

  const actions: any[] = [];

  if (player.hasLooked) {
    // Player has seen their cards, normal betting actions apply
    actions.push({ type: 'fold' });

    const amountToCall = getAmountToCall(gameState, playerId);
    if (amountToCall > 0) {
      if (player.balance >= amountToCall) {
        actions.push({ type: 'call', amount: amountToCall });
      } else {
        // ИСПРАВЛЕНИЕ: Если недостаточно денег на call, добавляем call с disabled флагом
        actions.push({ type: 'call', amount: player.balance, disabled: true });
      }
    } else {
      actions.push({ type: 'check' });
    }

    const minRaise = getMinRaise(gameState);
    const maxRaise = getMaxRaise(gameState, playerId);
    
    console.log(`[RAISE_MAX_DEBUG] getBlindBettingActions for player ${playerId}: hasRaiseMax=${gameState.hasRaiseMax}, maxRaise=${maxRaise}`);
    
    if (maxRaise > 0) {
      actions.push({
        type: 'raise',
        min: Math.min(minRaise, maxRaise),
        max: maxRaise,
        step: gameState.minBet,
      });
    } else {
      // ИСПРАВЛЕНИЕ: Если нет денег на raise, добавляем raise с disabled флагом
      actions.push({
        type: 'raise',
        min: minRaise,
        max: 0,
        step: gameState.minBet,
        disabled: true,
      });
    }
  } else {
    // Player has not seen their cards
    actions.push({ type: 'look' });

    // Can they make a blind bet?
    const lastBlindBet = gameState.currentBet || 0; // Changed from lastBet
    const nextBlindBet = lastBlindBet > 0 ? lastBlindBet * 2 : gameState.minBet;

    if (player.balance >= nextBlindBet) {
      actions.push({ type: 'blind', amount: nextBlindBet });
    }
    // ИСПРАВЛЕНИЕ: Если у игрока нет денег на blind, то и на call после look не хватит
    // В этом случае look будет доступен, но call/raise будут disabled
  }

  return actions;
};
