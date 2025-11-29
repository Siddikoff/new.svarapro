import { GameState } from '../../../types/game';

// Получение общей ставки игрока
export const getPlayerTotalBet = (
  gameState: GameState,
  playerId: string,
): number => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return 0;
  }
  return player.totalBet || 0;
};

// Получение суммы для уравнивания ставки
export const getAmountToCall = (
  gameState: GameState,
  playerId: string,
): number => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return 0;
  }

  const highestBet = Math.max(
    ...gameState.players.map((p) => getPlayerTotalBet(gameState, p.id)),
  );
  const playerBet = getPlayerTotalBet(gameState, playerId);

  const amountToCall = highestBet - playerBet;

  return amountToCall;
};

// Получение минимальной суммы для повышения ставки
export const getMinRaise = (gameState: GameState): number => {
  return gameState.minBet;
};

// Получение максимальной суммы для повышения ставки
export const getMaxRaise = (gameState: GameState, playerId: string): number => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return 0;
  }

  // ИСПРАВЛЕНИЕ: Если кто-то уже сделал raise max, блокируем raise
  if (gameState.hasRaiseMax) {
    console.log(`[RAISE_MAX_DEBUG] hasRaiseMax=true, blocking raise for player ${playerId}`);
    return 0;
  }

  const amountToCall = getAmountToCall(gameState, playerId);

  // Если игрок не может покрыть ставку, он не может повышать
  if (player.balance <= amountToCall) {
    return 0;
  }

  // Максимальное повышение - это остаток баланса после уравнивания
  const availableBalanceForRaise = player.balance - amountToCall;
  
  console.log(`[RAISE_MAX_DEBUG] Player ${playerId}: balance=${player.balance}, amountToCall=${amountToCall}, maxRaise=${availableBalanceForRaise}`);

  return availableBalanceForRaise;
};
