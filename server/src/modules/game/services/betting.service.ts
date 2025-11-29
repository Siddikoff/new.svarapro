import { Injectable } from '@nestjs/common';
import { GameState, Player, GameAction } from '../../../types/game';

@Injectable()
export class BettingService {
  // Обработка анте (входной ставки)
  processAnte(
    gameState: GameState,
    minBet: number,
  ): {
    updatedGameState: GameState;
    actions: GameAction[];
  } {
    const updatedGameState = { ...gameState };
    const actions: GameAction[] = [];

    // ПРАВИЛЬНО: Считаем активных игроков для определения логики fold
    const activePlayers = updatedGameState.players.filter(p => p.isActive && !p.hasFolded);

    for (let i = 0; i < updatedGameState.players.length; i++) {
      const player = updatedGameState.players[i];
      if (player.isActive) {
        // Проверяем, достаточно ли у игрока баланса
        if (player.balance < minBet) {
          // ПРАВИЛЬНО: Fold только если в игре 3+ игроков
          if (activePlayers.length > 2) {
            player.isActive = false;
            player.hasFolded = true;

            // Добавляем действие в лог
            const action: GameAction = {
              type: 'fold',
              telegramId: player.id,
              timestamp: Date.now(),
              message: `Игрок ${player.username} не имеет достаточно средств для анте`,
            };
            actions.push(action);
          }
          // Если 2 игрока - не fold, а сразу showdown (обрабатывается в startAntePhase)
        } else {
          // Снимаем анте с баланса игрока
          const roundedMinBet = Number(minBet.toFixed(2));
          player.balance -= roundedMinBet;
          player.totalBet = (player.totalBet || 0) + roundedMinBet; // Учитываем анте в общей ставке
          player.tableBalance += roundedMinBet;
          updatedGameState.pot = Number(
            (updatedGameState.pot + roundedMinBet).toFixed(2),
          );
          updatedGameState.chipCount += 1; // Увеличиваем счетчик фишек

          // Добавляем действие в лог
          const action: GameAction = {
            type: 'ante',
            telegramId: player.id,
            amount: minBet,
            timestamp: Date.now(),
            message: `Игрок ${player.username} внес анте ${minBet}`,
          };
          actions.push(action);
        }
      }
    }

    return { updatedGameState, actions };
  }

  // Централизованная функция определения якоря
  getAnchorPlayerIndex(gameState: GameState): number {
    // В betting фазе якорем является последний raise
    if (gameState.status === 'betting' && gameState.lastRaiseIndex !== undefined) {
      return gameState.lastRaiseIndex;
    }
    
    // В blind_betting фазе якорем является последний blind bettor
    if (gameState.status === 'blind_betting' && gameState.lastBlindBettorIndex !== undefined) {
      return gameState.lastBlindBettorIndex;
    }
    
    // Fallback к дилеру
    return gameState.dealerIndex;
  }

  // Упрощенная проверка завершения круга ставок
  isBettingRoundComplete(gameState: GameState): boolean {
    const activePlayers = gameState.players.filter(p => p.isActive && !p.hasFolded);
    const playersWhoCanAct = activePlayers.filter(p => p.balance > 0);

    // Если действовать может меньше 2-х игроков - круг окончен
    if (playersWhoCanAct.length < 2) {
      return true;
    }

    // Определяем якорь используя централизованную функцию
    const anchorIndex = this.getAnchorPlayerIndex(gameState);
    
    // Круг окончен, если ход вернулся к якорю
    if (gameState.currentPlayerIndex === anchorIndex) {
      const playersWithMoney = activePlayers.filter(p => p.balance > 0);
      if (playersWithMoney.length === 0) return true;
      
      const firstBet = playersWithMoney[0].totalBet;
      return playersWithMoney.every(p => p.totalBet === firstBet);
    }

    return false;
  }

  // Обработка выигрыша
  processWinnings(
    gameState: GameState,
    winnerIds: string[],
  ): {
    updatedGameState: GameState;
    actions: GameAction[];
  } {
    const updatedGameState = { ...gameState };
    const actions: GameAction[] = [];

    // Вычисляем комиссию (5% от банка)
    const rake = Number((updatedGameState.pot * 0.05).toFixed(2));
    const winAmount = Number((updatedGameState.pot - rake).toFixed(2));

    // Если есть несколько победителей, делим выигрыш поровну
    const winPerPlayer = Number((winAmount / winnerIds.length).toFixed(2));

    for (const winnerId of winnerIds) {
      const winner = updatedGameState.players.find((p) => p.id === winnerId);
      if (winner) {
        // Добавляем выигрыш победителю
        const roundedWinPerPlayer = Number(winPerPlayer.toFixed(2));
        winner.balance += roundedWinPerPlayer;

        // Добавляем действие в лог
        const action: GameAction = {
          type: 'win',
          telegramId: winnerId,
          amount: winPerPlayer,
          timestamp: Date.now(),
          message: `Игрок ${winner.username} выиграл ${winPerPlayer}`,
        };
        actions.push(action);
      }
    }

    // Устанавливаем комиссию и обнуляем банк
    updatedGameState.rake = rake;
    updatedGameState.pot = 0.0;

    // Устанавливаем победителей для анимации
    updatedGameState.winners = winnerIds
      .map((id) => updatedGameState.players.find((p) => p.id === id))
      .filter(Boolean) as Player[];

    // Добавляем действие о комиссии в лог
    if (rake > 0) {
      const action: GameAction = {
        type: 'join',
        telegramId: 'system',
        timestamp: Date.now(),
        message: `Комиссия: ${rake}`,
      };
      actions.push(action);
    }

    return { updatedGameState, actions };
  }

  // Упрощенная проверка возможности действия
  canPerformAction(player: Player, action: string, gameState: GameState): {
    canPerform: boolean;
    error?: string;
  } {
    if (!player.isActive || player.hasFolded) {
      return { canPerform: false, error: 'Игрок не активен' };
    }

    // Простые проверки по типу действия
    switch (action) {
      case 'blind_bet':
        return { canPerform: !player.hasLooked, error: 'Вы уже посмотрели карты' };
      
      case 'look':
        return { canPerform: !player.hasLooked, error: 'Вы уже посмотрели карты' };
      
      case 'call':
        if (gameState.status === 'betting') return { canPerform: true };
        if (gameState.status === 'blind_betting' && player.hasLookedAndMustAct) return { canPerform: true };
        return { canPerform: false, error: 'Сейчас нельзя уравнивать' };
      
      case 'raise':
        if (gameState.status === 'betting') return { canPerform: true };
        if (gameState.status === 'blind_betting' && player.hasLookedAndMustAct) return { canPerform: true };
        return { canPerform: false, error: 'Сейчас нельзя повышать' };
      
      case 'fold':
        return { canPerform: true };
      
      default:
        return { canPerform: false, error: 'Недопустимое действие' };
    }
  }
}
