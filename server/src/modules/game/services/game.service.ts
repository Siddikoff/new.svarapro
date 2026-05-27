import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../services/redis.service';
import {
  GameState,
  GameAction,
  GameActionResult,
  Room,
} from '../../../types/game';
import { CardService } from './card.service';
import { PlayerService } from './player.service';
import { BettingService } from './betting.service';
import { PotManager } from '../lib/pot-manager';
import { GameStateService } from './game-state.service';
import { UsersService } from '../../users/users.service';
import { FinancesService } from '../../finances/finances.service';
import { UserDataDto } from '../dto/user-data.dto';
import { TURN_DURATION_SECONDS } from '../../../constants/game.constants';

@Injectable()
export class GameService {
  private turnTimers = new Map<string, NodeJS.Timeout>(); // Хранение таймеров ходов
  private endGameInProgress = new Set<string>(); // Защита от повторных вызовов endGameWithWinner

  constructor(
    private readonly redisService: RedisService,
    private readonly cardService: CardService,
    private readonly playerService: PlayerService,
    private readonly bettingService: BettingService,
    private readonly gameStateService: GameStateService,
    private readonly usersService: UsersService,
    private readonly financesService: FinancesService,
  ) {
    setInterval(
      () => {
        this.redisService.cleanupDeadPlayers().catch((error) => {
          console.error('Error during periodic cleanup:', error);
        });
      },
      5 * 60 * 1000,
    );
  }

  async getRooms(): Promise<Room[]> {
    const roomIds = await this.redisService.getActiveRooms();
    const rooms: Room[] = [];
    for (const roomId of roomIds) {
      const room = await this.redisService.getRoom(roomId);
      if (room) {
        rooms.push(room);
      }
    }
    return rooms;
  }

  async leaveRoom(roomId: string, telegramId: string): Promise<void> {
    const room = await this.redisService.getRoom(roomId);
    const gameState = await this.redisService.getGameState(roomId);

    if (room) {
      room.players = room.players.filter((pId) => pId !== telegramId);
      if (room.players.length === 0) {
        await this.redisService.removeRoom(roomId);
        await this.redisService.clearGameData(roomId);
        await this.redisService.publishRoomUpdate(roomId, null);
      } else {
        await this.redisService.setRoom(roomId, room);
        await this.redisService.publishRoomUpdate(roomId, room);
      }
    }

    if (gameState) {
      const playerIndex = gameState.players.findIndex((p) => p.id === telegramId);

      if (playerIndex > -1) {
        const removedPlayer = gameState.players[playerIndex];
        gameState.players.splice(playerIndex, 1);

        try {
          await this.usersService.updatePlayerBalance(
            telegramId,
            removedPlayer.balance,
          );
          await this.redisService.publishBalanceUpdate(
            telegramId,
            removedPlayer.balance,
          );
        } catch (error) {
          console.error(
            `Failed to save balance for leaving player ${telegramId}:`,
            error,
          );
        }

        const action: GameAction = {
          type: 'leave',
          telegramId,
          timestamp: Date.now(),
          message: `Игрок ${removedPlayer.username} покинул стол`,
        };
        gameState.log.push(action);

        const activePlayers = gameState.players.filter(
          (p) => p.isActive && !p.hasFolded,
        );
        const activeStatuses = ['ante', 'blind_betting', 'betting', 'showdown'];

        if (
          activePlayers.length === 1 &&
          activeStatuses.includes(gameState.status)
        ) {
          await this.redisService.setGameState(roomId, gameState);
          await this.redisService.publishGameUpdate(roomId, gameState);
          await this.endGameWithWinner(roomId, gameState);
          return;
        }

        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);
      }
    }

    await this.redisService.removePlayerFromRoom(roomId, telegramId);
  }

  async joinRoom(
    roomId: string,
    telegramId: string,
  ): Promise<GameActionResult> {
    const room = await this.redisService.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Комната не найдена' };
    }

    if (!room.players.includes(telegramId)) {
      room.players.push(telegramId);
      await this.redisService.setRoom(roomId, room);
      await this.redisService.addPlayerToRoom(roomId, telegramId);
      await this.redisService.publishRoomUpdate(roomId, room);
    }

    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: 'Игра не найдена' };
    }

    return { success: true, gameState };
  }

  async sitDown(
    roomId: string,
    telegramId: string,
    position: number,
    userData: UserDataDto,
  ): Promise<GameActionResult> {
    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: 'Игра не найдена' };
    }

    if (gameState.players.some((p) => p.position === position)) {
      return { success: false, error: 'Это место уже занято' };
    }

    if (gameState.players.some((p) => p.id === telegramId)) {
      return { success: false, error: 'Вы уже сидите за столом' };
    }

    const userProfile = await this.usersService.getProfile(telegramId);

    if (userProfile.balance < gameState.minBet) {
      return { success: false, gameState };
    }
    const isGameInProgress = gameState.status !== 'waiting';
    const newPlayer = this.playerService.createPlayer(
      telegramId,
      userData,
      position,
      userProfile.balance,
      !isGameInProgress,
    );
    gameState.players.push(newPlayer);

    const action: GameAction = {
      type: 'join',
      telegramId,
      timestamp: Date.now(),
      message: `Игрок ${newPlayer.username} сел за стол на позицию ${position}`,
    };
    gameState.log.push(action);

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);

    const room = await this.redisService.getRoom(roomId);
    if (room && gameState.players.length >= 2 && room.status === 'waiting') {
      await this.startGame(roomId);
    }

    return { success: true, gameState };
  }

  async startGame(roomId: string): Promise<void> {
    const room = await this.redisService.getRoom(roomId);
    if (!room || (room.status !== 'waiting' && room.status !== 'finished')) {
      return;
    }

    if (room.status === 'waiting') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const gameState = await this.redisService.getGameState(roomId);

    if (room.status === 'finished' && gameState) {
      const minBalance = room.minBet * 10;
      gameState.players = gameState.players.filter(
        (p) => p.balance >= minBalance,
      );
    }

    if (!gameState || gameState.players.length < 2) {
      room.status = 'waiting';
      await this.redisService.setRoom(roomId, room);
      if (gameState) {
        const newGameState = this.gameStateService.createInitialGameState(
          roomId,
          room.minBet,
        );
        newGameState.players = gameState.players.map((p) =>
          this.playerService.resetPlayerForNewGame(p, false),
        );
        await this.redisService.setGameState(roomId, newGameState);
        await this.redisService.publishGameUpdate(roomId, newGameState);
      }
      await this.redisService.publishRoomUpdate(roomId, room);
      return;
    }

    room.status = 'playing';
    await this.redisService.setRoom(roomId, room);
    await this.redisService.publishRoomUpdate(roomId, room);

    const { updatedGameState, actions } =
      this.gameStateService.initializeNewGame(gameState, room.winner);

    const finalGameState = updatedGameState;
    finalGameState.log.push(...actions);

    await this.redisService.setGameState(roomId, finalGameState);
    await this.redisService.publishGameUpdate(roomId, finalGameState);

    await this.startAntePhase(roomId);
    
    // Запускаем таймер для первого игрока
    const initialGameState = await this.redisService.getGameState(roomId);
    if (initialGameState && initialGameState.currentPlayerIndex !== undefined) {
      const currentPlayer = initialGameState.players[initialGameState.currentPlayerIndex];
      if (currentPlayer) {
        this.startTurnTimer(roomId, currentPlayer.id);
        // Обновляем GameState с информацией о таймере
        initialGameState.timer = TURN_DURATION_SECONDS;
        initialGameState.turnStartTime = Date.now();
        await this.redisService.setGameState(roomId, initialGameState);
        await this.redisService.publishGameUpdate(roomId, initialGameState);
      }
    }
  }

  async startAntePhase(roomId: string): Promise<void> {
    let gameState = await this.redisService.getGameState(roomId);
    if (!gameState || gameState.status !== 'ante') {
      console.log('🚫 startAntePhase skipped:', {
        roomId,
        hasGameState: !!gameState,
        status: gameState?.status,
      });
      return;
    }

    const { updatedGameState, actions } = this.bettingService.processAnte(
      gameState,
      gameState.minBet,
    );
    gameState = updatedGameState;
    gameState.log.push(...actions);

    const activePlayers = gameState.players.filter((p) => p.isActive);
    if (activePlayers.length < 2) {
      if (activePlayers.length === 1) {
        await this.endGameWithWinner(roomId, gameState);
      } else {
        await this.endGame(roomId, gameState, 'no_winner');
      }
      return;
    }

    const dealResult = this.gameStateService.dealCardsToPlayers(gameState);
    gameState = dealResult.updatedGameState;
    gameState.log.push(...dealResult.actions);

    const phaseResult = this.gameStateService.moveToNextPhase(
      gameState,
      'blind_betting',
    );
    gameState = phaseResult.updatedGameState;
    gameState.log.push(...phaseResult.actions);

    gameState.currentPlayerIndex = this.playerService.findNextActivePlayer(
      gameState.players,
      gameState.dealerIndex,
    );

    // Если нет игроков с деньгами, завершаем игру
    if (gameState.currentPlayerIndex === -1) {
      await this.endGameWithWinner(roomId, gameState);
      return;
    }

    // ИСПРАВЛЕНИЕ: Проверяем случай свары с недостатком средств ПОСЛЕ установки currentPlayerIndex
    if (gameState.isSvara) {
      const svaraParticipants = gameState.players.filter(p => 
        gameState.svaraParticipants?.includes(p.id) && p.isActive
      );
      
      // ПРАВИЛЬНО: Если в сваре 2 игрока и у хотя бы одного нет денег - сразу showdown
      if (svaraParticipants.length === 2) {
        const participantsWithoutMoney = svaraParticipants.filter(p => p.balance < gameState.minBet);
        if (participantsWithoutMoney.length > 0) {
          // Сразу showdown, не предлагать ходы
          await this.endGameWithWinner(roomId, gameState);
          return;
        }
      }
    }

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);
    
  }

  private svaraTimers: Map<string, NodeJS.Timeout> = new Map();

  async joinSvara(
    roomId: string,
    telegramId: string,
  ): Promise<GameActionResult> {
    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: 'Игра не найдена' };
    }

    if (gameState.status !== 'svara_pending') {
      if (gameState.svaraConfirmed?.includes(telegramId)) {
        return { success: true, gameState };
      } else {
        return { success: false, error: 'Сейчас нельзя присоединиться к сваре' };
      }
    }

    if (
      gameState.svaraConfirmed?.includes(telegramId) ||
      gameState.svaraDeclined?.includes(telegramId)
    ) {
      return { success: true, gameState };
    }

    const player = gameState.players.find((p) => p.id === telegramId);
    if (!player) {
      return { success: false, error: 'Игрок не найден' };
    }

    const isOriginalWinner =
      gameState.svaraParticipants &&
      gameState.svaraParticipants.includes(telegramId);

    if (!gameState.svaraConfirmed) {
      gameState.svaraConfirmed = [];
    }

    if (isOriginalWinner) {
      if (!gameState.svaraConfirmed.includes(telegramId)) {
        gameState.svaraConfirmed.push(telegramId);
      }
    } else {
      // Используем изначальный банк свары для входа
      const svaraBuyInAmount = gameState.svaraOriginalPot || gameState.pot;
      if (player.balance < svaraBuyInAmount) {
        return {
          success: false,
          error: 'Недостаточно средств для входа в свару',
        };
      }

      player.balance -= svaraBuyInAmount;
      gameState.pot += svaraBuyInAmount;
      player.totalBet = (player.totalBet || 0) + svaraBuyInAmount;

      if (!gameState.svaraConfirmed.includes(telegramId)) {
        gameState.svaraConfirmed.push(telegramId);
      }
    }

    const action: GameAction = {
      type: 'join',
      telegramId,
      timestamp: Date.now(),
      message: isOriginalWinner
        ? `Игрок ${player.username} участвует в сваре как победитель`
        : `Игрок ${player.username} присоединился к сваре, добавив в банк ${gameState.pot}`,
    };
    gameState.log.push(action);

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);

    await this._checkSvaraCompletion(roomId, gameState);

    return { success: true, gameState };
  }

  async skipSvara(
    roomId: string,
    telegramId: string,
  ): Promise<GameActionResult> {
    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState || gameState.status !== 'svara_pending') {
      return { success: false, error: 'Сейчас нельзя пропустить свару' };
    }

    if (
      gameState.svaraConfirmed?.includes(telegramId) ||
      gameState.svaraDeclined?.includes(telegramId)
    ) {
      return { success: true, gameState };
    }

    const player = gameState.players.find((p) => p.id === telegramId);
    if (!player) {
      return { success: false, error: 'Игрок не найден' };
    }

    if (!gameState.svaraDeclined) {
      gameState.svaraDeclined = [];
    }
    if (!gameState.svaraDeclined.includes(telegramId)) {
      gameState.svaraDeclined.push(telegramId);
    }

    const action: GameAction = {
      type: 'fold',
      telegramId,
      timestamp: Date.now(),
      message: `Игрок ${player.username} решил пропустить свару`,
    };
    gameState.log.push(action);

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);

    await this._checkSvaraCompletion(roomId, gameState);

    return { success: true, gameState };
  }

  async processAction(
    roomId: string,
    telegramId: string,
    action: string,
    amount?: number,
  ): Promise<GameActionResult> {
    if (action === 'join_svara') {
      return this.joinSvara(roomId, telegramId);
    }
    if (action === 'skip_svara') {
      return this.skipSvara(roomId, telegramId);
    }

    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: 'Игра не найдена' };
    }

    // Если игра в фазе svara_pending, обычные действия не обрабатываются
    if (gameState.status === 'svara_pending') {
      return { success: false, error: 'Игра в фазе ожидания свары' };
    }

    const playerIndex = gameState.players.findIndex((p) => p.id === telegramId);
    const player = gameState.players[playerIndex];

    if (!player) {
      return { success: false, error: 'Игрок не найден в этой игре' };
    }

    // Проверяем, что у игрока есть деньги для действий (кроме fold и raise)
    if (action !== 'fold' && action !== 'raise' && player.balance <= 0) {
      return { success: false, error: 'Недостаточно средств для выполнения действия' };
    }

    if (action === 'fold') {
      if (gameState.currentPlayerIndex !== playerIndex) {
        return { success: false, error: 'Сейчас не ваш ход' };
      }
      return this.handleFold(roomId, gameState, playerIndex);
    }

    if (player.hasLookedAndMustAct && !['raise', 'call', 'fold'].includes(action)) {
      return {
        success: false,
        error:
          'После просмотра карт вы можете только уравнять, повысить ставку или сбросить карты',
      };
    }

    if (gameState.currentPlayerIndex !== playerIndex) {
      return { success: false, error: 'Сейчас не ваш ход' };
    }

    const { canPerform, error } = this.bettingService.canPerformAction(
      player,
      action,
      gameState,
    );
    if (!canPerform) {
      return { success: false, error };
    }

    switch (action) {
      case 'blind_bet':
      case 'look':
        return this.processBlindBettingAction(
          roomId,
          gameState,
          playerIndex,
          action,
        );
      case 'call':
      case 'raise':
        return this.processBettingAction(
          roomId,
          gameState,
          playerIndex,
          action,
          amount,
        );
      default:
        return {
          success: false,
          error: 'Недопустимое действие в текущей фазе',
        };
    }
  }

  private async handleFold(
    roomId: string,
    gameState: GameState,
    playerIndex: number,
  ): Promise<GameActionResult> {
    const player = gameState.players[playerIndex];

    if (
      gameState.status === 'blind_betting' &&
      gameState.lastBlindBettorIndex !== undefined
    ) {
      const lastBettor = gameState.players[gameState.lastBlindBettorIndex];
      if (lastBettor && lastBettor.id !== player.id) {
        gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
          player,
          {
            hasFolded: true,
            lastAction: 'fold',
            hasLookedAndMustAct: false,
          },
        );
        const foldAction: GameAction = {
          type: 'fold',
          telegramId: player.id,
          timestamp: Date.now(),
          message: `Игрок ${player.username} сбросил карты в ответ на ставку вслепую`,
        };
        gameState.log.push(foldAction);

        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);

        await this.endGameWithWinner(roomId, gameState);
        return { success: true };
      }
    }

    gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
      player,
      {
        hasFolded: true,
        lastAction: 'fold',
        hasLookedAndMustAct: false,
      },
    );

    const foldAction: GameAction = {
      type: 'fold',
      telegramId: player.id,
      timestamp: Date.now(),
      message: `Игрок ${player.username} сбросил карты`,
    };
    gameState.log.push(foldAction);

    const activePlayers = gameState.players.filter((p) => !p.hasFolded);

    if (activePlayers.length === 1) {
      await this.redisService.setGameState(roomId, gameState);
      await this.redisService.publishGameUpdate(roomId, gameState);
      await this.endGameWithWinner(roomId, gameState);
      return { success: true };
    } else {
      const aboutToActPlayerIndex = this.playerService.findNextActivePlayer(
        gameState.players,
        gameState.currentPlayerIndex,
      );
      
      // Если нет игроков с деньгами, завершаем игру
      if (aboutToActPlayerIndex === -1) {
        await this.endGameWithWinner(roomId, gameState);
        return { success: true };
      }
      
      // Проверяем завершение круга ставок
      const anchorPlayerIndex = this.bettingService.getAnchorPlayerIndex(gameState);
      
      if (aboutToActPlayerIndex === anchorPlayerIndex) {
        await this.endBettingRound(roomId, gameState);
        return { success: true };
      } else {
        gameState.currentPlayerIndex = aboutToActPlayerIndex;
      }
    }

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);
    return { success: true, gameState };
  }

  private async processBlindBettingAction(
    roomId: string,
    gameState: GameState,
    playerIndex: number,
    action: string,
  ): Promise<GameActionResult> {
    const player = gameState.players[playerIndex];
    switch (action) {
      case 'blind_bet': {
        const blindBetAmount =
          gameState.lastBlindBet > 0
            ? gameState.lastBlindBet * 2
            : gameState.minBet;
        if (player.balance < blindBetAmount) {
          return { success: false, error: 'Недостаточно средств' };
        }
        const { updatedPlayer, action: blindAction } =
          this.playerService.processPlayerBet(
            player,
            blindBetAmount,
            'blind_bet',
          );
        gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
          updatedPlayer,
          { lastAction: 'blind' },
        );
        gameState.pot = Number((gameState.pot + blindBetAmount).toFixed(2));
        gameState.chipCount += 1;
        gameState.lastBlindBet = blindBetAmount;
        gameState.lastBlindBettorIndex = playerIndex;
        gameState.lastActionAmount = blindBetAmount; // ИСПРАВЛЕНИЕ: Обновляем lastActionAmount при blind_bet
        gameState.log.push(blindAction);
        gameState.isAnimating = true;
        gameState.animationType = 'chip_fly';

        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        gameState.isAnimating = false;
        gameState.animationType = undefined;

        gameState.currentPlayerIndex = this.playerService.findNextActivePlayer(
          gameState.players,
          gameState.currentPlayerIndex,
        );
        
        // Если нет игроков с деньгами, завершаем игру
        if (gameState.currentPlayerIndex === -1) {
          await this.endGameWithWinner(roomId, gameState);
          return { success: true, gameState };
        }
        
        // Запускаем таймер для следующего игрока
        if (gameState.currentPlayerIndex !== undefined) {
          const nextPlayer = gameState.players[gameState.currentPlayerIndex];
          if (nextPlayer) {
            this.startTurnTimer(roomId, nextPlayer.id);
            // Обновляем GameState с информацией о таймере
            gameState.timer = TURN_DURATION_SECONDS;
            gameState.turnStartTime = Date.now();
          }
        }
        break;
      }
      case 'look': {
        const calculatedScore = this.cardService.calculateScore(player.cards);

        gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
          player,
          {
            hasLooked: true,
            lastAction: 'look',
            hasLookedAndMustAct: true,
          },
        );
        gameState.players[playerIndex].score = calculatedScore;

        const lookAction: GameAction = {
          type: 'look',
          telegramId: player.id,
          timestamp: Date.now(),
          message: `Игрок ${player.username} посмотрел карты и имеет ${calculatedScore} очков`,
        };
        gameState.log.push(lookAction);
        break;
      }
    }
    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);
    return { success: true, gameState };
  }

  private async processBettingAction(
    roomId: string,
    gameState: GameState,
    playerIndex: number,
    action: string,
    amount?: number,
  ): Promise<GameActionResult> {
    const player = gameState.players[playerIndex];
    switch (action) {
      case 'call': {
        // ИСПРАВЛЕНИЕ: Убираем обработку call для hasLookedAndMustAct
        // В blind_betting можно только raise после look

        // ИСПРАВЛЕНИЕ: call после look НЕ завершает игру, а устанавливает якорь
        if (playerIndex === gameState.lastRaiseIndex && !player.hasLookedAndMustAct) {
          await this.endBettingRound(roomId, gameState);
          return { success: true };
        }

        // ИСПРАВЛЕНИЕ: Правильный расчет callAmount для look -> call
        let callAmount = gameState.lastActionAmount;
        // Если нет последней ставки, используем minBet (ante)
        if (callAmount <= 0) {
          callAmount = gameState.minBet;
        }
        if (callAmount <= 0) {
          return {
            success: false,
            error: 'Нечего уравнивать',
          };
        }
        if (player.balance < callAmount) {
          return { success: false, error: 'Недостаточно средств' };
        }

        const { updatedPlayer, action: callAction } =
          this.playerService.processPlayerBet(player, callAmount, 'call');
        gameState.players[playerIndex] = updatedPlayer;
        gameState.pot = Number((gameState.pot + callAmount).toFixed(2));
        gameState.chipCount += 1;
        
        // ИСПРАВЛЕНИЕ: Не обновляем lastActionAmount при call после raise max
        if (!gameState.hasRaiseMax) {
          gameState.lastActionAmount = callAmount;
        }
        
        gameState.log.push(callAction);
        
        // ИСПРАВЛЕНИЕ: call после look устанавливает якорь и переводит в betting
        if (player.hasLookedAndMustAct) {
          // Call после look устанавливает якорь ТОЛЬКО если якорь еще не установлен
          if (gameState.lastRaiseIndex === undefined) {
            gameState.lastRaiseIndex = playerIndex;
          }
          
          // Переводим игру в фазу betting только если мы еще в blind_betting
          if (gameState.status === 'blind_betting') {
            const phaseResult = this.gameStateService.moveToNextPhase(
              gameState,
              'betting',
            );
            gameState = phaseResult.updatedGameState;
            gameState.log.push(...phaseResult.actions);
          }

          // Устанавливаем hasLooked = true для всех других игроков
          for (let i = 0; i < gameState.players.length; i++) {
            if (
              i !== playerIndex &&
              gameState.players[i].isActive &&
              !gameState.players[i].hasFolded
            ) {
              gameState.players[i] = this.playerService.updatePlayerStatus(
                gameState.players[i],
                { hasLooked: true },
              );
            }
          }

          // Рассчитываем очки для всех игроков
          const scoreResult =
            this.gameStateService.calculateScoresForPlayers(gameState);
          gameState = scoreResult.updatedGameState;
          gameState.log.push(...scoreResult.actions);
        }
        
        break;
      }
      case 'raise': {
        const raiseAmount = amount || 0;
        const isPostLookRaise = player.hasLookedAndMustAct;

        const minRaiseAmount =
          gameState.lastBlindBet > 0
            ? gameState.lastBlindBet * 2
            : gameState.minBet;

        if (raiseAmount < minRaiseAmount) {
          return {
            success: false,
            error: `Минимальное повышение: ${minRaiseAmount}`,
          };
        }

        if (player.balance < raiseAmount) {
          return { success: false, error: 'Недостаточно средств' };
        }

        const { updatedPlayer, action: raiseAction } =
          this.playerService.processPlayerBet(player, raiseAmount, 'raise');

        raiseAction.message = `Игрок ${player.username} повысил до ${raiseAmount}`;

        gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
          updatedPlayer,
          { hasLookedAndMustAct: false },
        );

        gameState.pot = Number((gameState.pot + raiseAmount).toFixed(2));
        gameState.chipCount += 1;
        
        // Устанавливаем lastRaiseIndex для raise
        gameState.lastRaiseIndex = playerIndex;
        
        gameState.lastActionAmount = raiseAmount;
        
        // ИСПРАВЛЕНИЕ: Проверяем, является ли это raise max
        if (updatedPlayer.balance === 0) {
          gameState.hasRaiseMax = true;
          gameState.raiseMaxPlayerIndex = playerIndex;
        }
        
        gameState.log.push(raiseAction);

        if (isPostLookRaise) {
          // Переводим игру в фазу betting только если мы еще в blind_betting
          if (gameState.status === 'blind_betting') {
            const phaseResult = this.gameStateService.moveToNextPhase(
              gameState,
              'betting',
            );
            gameState = phaseResult.updatedGameState;
            gameState.log.push(...phaseResult.actions);
          }

          for (let i = 0; i < gameState.players.length; i++) {
            if (
              i !== playerIndex &&
              gameState.players[i].isActive &&
              !gameState.players[i].hasFolded
            ) {
              gameState.players[i] = this.playerService.updatePlayerStatus(
                gameState.players[i],
                { hasLooked: true },
              );
            }
          }

          const scoreResult =
            this.gameStateService.calculateScoresForPlayers(gameState);
          gameState = scoreResult.updatedGameState;
          gameState.log.push(...scoreResult.actions);
        }
        
        break;
      }
    }

    gameState.isAnimating = true;
    gameState.animationType = 'chip_fly';

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    gameState.isAnimating = false;
    gameState.animationType = undefined;

    // ИСПРАВЛЕНИЕ: Проверяем завершение круга ДО передачи хода
    // Если следующий игрок будет якорем, то круг завершается
    const aboutToActPlayerIndex = this.playerService.findNextActivePlayer(
      gameState.players,
      gameState.currentPlayerIndex,
    );

    // Если нет игроков с деньгами, завершаем игру
    if (aboutToActPlayerIndex === -1) {
      await this.endGameWithWinner(roomId, gameState);
      return { success: true, gameState };
    }

    // Проверяем завершение круга ставок
    const anchorPlayerIndex = this.bettingService.getAnchorPlayerIndex(gameState);
    
    if (aboutToActPlayerIndex === anchorPlayerIndex) {
      await this.endBettingRound(roomId, gameState);
    } else {
      gameState.currentPlayerIndex = aboutToActPlayerIndex;
      
      // Запускаем таймер для следующего игрока
      if (gameState.currentPlayerIndex !== undefined) {
        const nextPlayer = gameState.players[gameState.currentPlayerIndex];
        if (nextPlayer) {
          this.startTurnTimer(roomId, nextPlayer.id);
          // Обновляем GameState с информацией о таймере
          gameState.timer = TURN_DURATION_SECONDS;
          gameState.turnStartTime = Date.now();
        }
      }
      
      await this.redisService.setGameState(roomId, gameState);
      await this.redisService.publishGameUpdate(roomId, gameState);
    }
    return { success: true, gameState };
  }

  private async endBettingRound(
    roomId: string,
    gameState: GameState,
  ): Promise<void> {
    const scoreResult = this.gameStateService.calculateScoresForPlayers(gameState);
    gameState = scoreResult.updatedGameState;
    gameState.log.push(...scoreResult.actions);

    await this.endGameWithWinner(roomId, gameState);
  }

  private async _checkSvaraCompletion(
    roomId: string,
    gameState: GameState,
  ): Promise<void> {
    const totalPlayers = gameState.players.length;
    const decisionsCount =
      (gameState.svaraConfirmed?.length || 0) +
      (gameState.svaraDeclined?.length || 0);

    if (decisionsCount >= totalPlayers) {
      console.log(
        `All ${totalPlayers} players have made a decision for svara in room ${roomId}. Resolving immediately.`,
      );
      await this.resolveSvara(roomId);
    }
  }

  private async resolveSvara(roomId: string): Promise<void> {
    if (this.svaraTimers.has(roomId)) {
      clearTimeout(this.svaraTimers.get(roomId));
      this.svaraTimers.delete(roomId);
    }

    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState || gameState.status !== 'svara_pending') {
      return;
    }

    // Подстраховка: участники свары (тай-победители раздачи) всегда
    // должны быть подтверждены, даже если по какой-то причине список
    // svaraConfirmed был сброшен. Не-участники остаются нетронутыми —
    // их решение мы получаем явно через joinSvara/skipSvara.
    if (!gameState.svaraConfirmed) gameState.svaraConfirmed = [];
    if (!gameState.svaraDeclined) gameState.svaraDeclined = [];
    for (const id of gameState.svaraParticipants ?? []) {
      if (gameState.svaraConfirmed.includes(id)) continue;
      if (gameState.svaraDeclined.includes(id)) continue;
      gameState.svaraConfirmed.push(id);
    }

    const participants = gameState.svaraConfirmed;

    if (participants.length >= 2) {
      // ИСПРАВЛЕНИЕ: Проверяем, могут ли участники свары внести деньги
      const svaraPlayers = gameState.players.filter(p => participants.includes(p.id));
      const playersWithoutMoney = svaraPlayers.filter(p => p.balance < gameState.minBet);
      
      // Если в сваре только 2 игрока и у одного 0$ - сразу showdown
      if (svaraPlayers.length === 2 && playersWithoutMoney.length === 1) {
        console.log(`[resolveSvara] Only 2 players in svara, one with 0$ - going to showdown`);
        
        // Принудительно завершаем игру с победителем (игрок с деньгами)
        const winnerWithMoney = svaraPlayers.find(p => p.balance >= gameState.minBet);
        if (winnerWithMoney) {
          // Очищаем таймер
          this.clearTurnTimer(roomId);
          gameState.timer = undefined;
          gameState.turnStartTime = undefined;
          
          // Переходим в showdown с одним победителем
          const phaseResult = this.gameStateService.moveToNextPhase(
            gameState,
            'showdown',
          );
          const updatedGameState = phaseResult.updatedGameState;
          updatedGameState.log.push(...phaseResult.actions);
          updatedGameState.winners = [winnerWithMoney];
          
          await this.redisService.setGameState(roomId, updatedGameState);
          await this.redisService.publishGameUpdate(roomId, updatedGameState);
          
          // Распределяем выигрыш
          setTimeout(() => {
            this.distributeWinnings(roomId).catch((error) => {
              console.error(`Failed to distribute winnings for room ${roomId}:`, error);
            });
          }, 3000);
        }
        return;
      }
      
      // Если в сваре 2+ игроков и у одного 0$ - автоматический fold
      if (svaraPlayers.length > 2 && playersWithoutMoney.length > 0) {
        console.log(`[resolveSvara] Multiple players in svara, some with 0$ - auto-folding players without money`);
        
        // Автоматически fold игроков без денег
        for (const player of playersWithoutMoney) {
          const playerIndex = gameState.players.findIndex(p => p.id === player.id);
          if (playerIndex !== -1) {
            gameState.players[playerIndex] = this.playerService.updatePlayerStatus(
              gameState.players[playerIndex],
              { hasFolded: true, lastAction: 'fold' }
            );
            
            const action: GameAction = {
              type: 'fold',
              telegramId: player.id,
              timestamp: Date.now(),
              message: `Игрок ${player.username} автоматически покинул свару (недостаток средств)`,
            };
            gameState.log.push(action);
          }
        }
        
        // Сохраняем изменения в Redis
        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);
        
        // Обновляем список участников свары
        const remainingParticipants = participants.filter(id => 
          !playersWithoutMoney.some(p => p.id === id)
        );
        
        if (remainingParticipants.length >= 2) {
          await this.startSvaraGame(roomId, remainingParticipants);
        } else {
          // Если остался только один участник, он выигрывает
          await this.endGameWithWinner(roomId, gameState);
        }
        return;
      }
      
      // Если у всех участников свары нет денег, делим банк пополам
      if (playersWithoutMoney.length === svaraPlayers.length && svaraPlayers.length === 2) {
        console.log(`[resolveSvara] Svara participants have no money, splitting pot between ${svaraPlayers.length} players`);
        
        const rake = Number((gameState.pot * 0.05).toFixed(2));
        const winAmount = Number(((gameState.pot - rake) / 2).toFixed(2));
        
        for (const player of svaraPlayers) {
          const playerIndex = gameState.players.findIndex(p => p.id === player.id);
          if (playerIndex !== -1) {
            gameState.players[playerIndex].balance += winAmount;
            
            const action: GameAction = {
              type: 'win',
              telegramId: player.id,
              amount: winAmount,
              timestamp: Date.now(),
              message: `Игрок ${player.username} получил ${winAmount} в сваре (недостаток средств)`,
            };
            gameState.log.push(action);
          }
        }
        
        // Добавляем действие о комиссии
        if (rake > 0) {
          await this.financesService.addToSystemWallet(rake);
          const action: GameAction = {
            type: 'join',
            telegramId: 'system',
            timestamp: Date.now(),
            message: `Комиссия: ${rake}`,
          };
          gameState.log.push(action);
        }
        
        // Завершаем игру
        gameState.pot = 0;
        gameState.status = 'finished';
        gameState.winners = svaraPlayers;
        
        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);
        return;
      }
      
      await this.startSvaraGame(roomId, participants);
    } else if (participants.length === 1) {
      await this.endGameWithWinner(roomId, gameState);
    } else {
      await this.endGame(roomId, gameState, 'no_winner');
    }
  }

  private async startSvaraGame(
    roomId: string,
    participantIds: string[],
  ): Promise<void> {
    let gameState = await this.redisService.getGameState(roomId);
    if (!gameState) return;

    const { updatedGameState, actions } =
      this.gameStateService.initializeSvaraGame(gameState, participantIds);
    gameState = updatedGameState;
    gameState.log.push(...actions);

    const dealResult = this.gameStateService.dealCardsToPlayers(gameState);
    gameState = dealResult.updatedGameState;
    gameState.log.push(...dealResult.actions);

    const phaseResult = this.gameStateService.moveToNextPhase(
      gameState,
      'blind_betting',
    );
    gameState = phaseResult.updatedGameState;
    gameState.log.push(...phaseResult.actions);

    gameState.currentPlayerIndex = this.playerService.findNextActivePlayer(
      gameState.players,
      gameState.dealerIndex,
    );

    // Если нет игроков с деньгами, завершаем игру
    if (gameState.currentPlayerIndex === -1) {
      await this.endGameWithWinner(roomId, gameState);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Запускаем таймер для первого игрока новой свары. Без этого
    // ходовой таймер не идёт, игра «зависает» сразу после рестарта
    // свары (как в обычной startGame после ante).
    const firstPlayer = gameState.players[gameState.currentPlayerIndex];
    if (firstPlayer) {
      this.startTurnTimer(roomId, firstPlayer.id);
      gameState.timer = TURN_DURATION_SECONDS;
      gameState.turnStartTime = Date.now();
    }

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);
  }

  private async endGameWithWinner(
    roomId: string,
    gameState: GameState,
  ): Promise<void> {
    if (!gameState) return;

    // Защита от повторных вызовов
    if (this.endGameInProgress.has(roomId)) {
      return;
    }

    this.endGameInProgress.add(roomId);

    try {
      const scoreResult =
        this.gameStateService.calculateScoresForPlayers(gameState);
      gameState = scoreResult.updatedGameState;
      gameState.log.push(...scoreResult.actions);

      const activePlayers = gameState.players.filter((p) => !p.hasFolded);
      const overallWinners = this.playerService.determineWinners(activePlayers);

      if (overallWinners.length > 1) {
        console.log(`Svara detected in room ${roomId}. Pot will be carried over.`);
      
        // Очищаем таймер при переходе в svara_pending
        this.clearTurnTimer(roomId);
        gameState.timer = undefined;
        gameState.turnStartTime = undefined;
      
        const phaseResult = this.gameStateService.moveToNextPhase(
          gameState,
          'svara_pending',
        );
        gameState = phaseResult.updatedGameState;
        gameState.log.push(...phaseResult.actions);

        gameState.isSvara = true;
        gameState.svaraParticipants = overallWinners.map((w) => w.id);
        gameState.winners = overallWinners;
        // Участники свары (тай-победители текущей раздачи) уже играют,
        // им не нужно жать «присоединиться». Подтверждаем их сразу;
        // не-участники (folded earlier) могут купить вход за тот же банк
        // в течение TURN_DURATION_SECONDS, иначе мы стартуем свару только
        // с уже подтверждёнными участниками.
        gameState.svaraConfirmed = overallWinners.map((w) => w.id);
        gameState.svaraDeclined = [];
        gameState.svaraOriginalPot = gameState.pot; // Сохраняем изначальный банк свары

        const svaraAction: GameAction = {
          type: 'svara',
          telegramId: 'system',
          timestamp: Date.now(),
          message: `Объявлена "Свара"! Банк ${gameState.pot} переходит в следующий раунд.`,
        };
        gameState.log.push(svaraAction);

        // Когда таймер ставок свары стартует — нужен ориентир для
        // обратного отсчёта на клиенте (для участников панель
        // «ждём остальных», для не-участников 15-сек попап).
        gameState.timer = TURN_DURATION_SECONDS;
        gameState.turnStartTime = Date.now();

        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);

        // Если все живые игроки в комнате — участники свары (например,
        // 2-player свара), решений ждать не от кого: запускаем
        // resolveSvara сразу, чтобы новый раунд стартовал после
        // SVARA-анимации (внутри startSvaraGame есть 3-сек пауза).
        const totalPlayers = gameState.players.length;
        const allArePartisipants =
          gameState.svaraConfirmed.length >= totalPlayers;

        // Резолвим асинхронно (без await), чтобы не блокировать
        // вызывающий action-handler на 3 секунды паузы внутри
        // startSvaraGame. Все мутации состояния идут через
        // redisService.setGameState, так что параллельность безопасна.
        const delayMs = allArePartisipants ? 0 : TURN_DURATION_SECONDS * 1000;
        const timer = setTimeout(() => {
          this.resolveSvara(roomId).catch((error) => {
            console.error(`Error resolving svara for room ${roomId}:`, error);
          });
        }, delayMs);
        this.svaraTimers.set(roomId, timer);
      } else {
      
        // Очищаем таймер при переходе в showdown
        this.clearTurnTimer(roomId);
        gameState.timer = undefined;
        gameState.turnStartTime = undefined;
      
        const phaseResult = this.gameStateService.moveToNextPhase(
          gameState,
          'showdown',
        );
        gameState = phaseResult.updatedGameState;
        gameState.log.push(...phaseResult.actions);
        gameState.winners = overallWinners;

        await this.redisService.setGameState(roomId, gameState);
        await this.redisService.publishGameUpdate(roomId, gameState);

        setTimeout(() => {
          this.distributeWinnings(roomId).catch((error) => {
            console.error(`Failed to distribute winnings for room ${roomId}:`, error);
          });
        }, 3000);
      }
    } finally {
      // Очищаем флаг в конце функции
      this.endGameInProgress.delete(roomId);
    }
  }

  private async distributeWinnings(roomId: string): Promise<void> {
    let gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      console.error(`[distributeWinnings] Game state not found for room ${roomId}`);
      return;
    }


    // Reset lastWinAmount for all players
    for (const p of gameState.players) {
      p.lastWinAmount = 0;
    }

    const winners = gameState.winners || [];

    if (winners.length === 0) {
      console.log('[distributeWinnings] No winners found, ending game.');
      await this.endGame(roomId, gameState, 'no_winner');
      return;
    }

    if (winners.length === 1) {
      const winnerId = winners[0].id;
      const winnerBefore = gameState.players.find(p => p.id === winnerId);
      const balanceBefore = winnerBefore ? winnerBefore.balance : 0;

      const { updatedGameState, actions } = this.bettingService.processWinnings(
        gameState,
        [winnerId],
      );
      gameState = updatedGameState;
      gameState.log.push(...actions);

      const winnerAfter = gameState.players.find(p => p.id === winnerId);
      const balanceAfter = winnerAfter ? winnerAfter.balance : 0;
      if (winnerAfter) {
        winnerAfter.lastWinAmount = balanceAfter - balanceBefore;
      }
    }

    for (const player of gameState.players) {
      await this.usersService.updatePlayerBalance(player.id, player.balance);
      await this.redisService.publishBalanceUpdate(player.id, player.balance);
    }

    const phaseResult = this.gameStateService.moveToNextPhase(
      gameState,
      'finished',
    );
    gameState = phaseResult.updatedGameState;
    gameState.log.push(...phaseResult.actions);

    await this.redisService.setGameState(roomId, gameState);
    await this.redisService.publishGameUpdate(roomId, gameState);

    await this.endGame(roomId, gameState, 'winner');
  }

  private async endGame(roomId: string, gameState: GameState, reason: 'winner' | 'no_winner' | 'svara'): Promise<void> {

    // Очищаем таймер для этой комнаты
    this.clearTurnTimer(roomId);
    
    // Очищаем таймер в GameState
    gameState.timer = undefined;
    gameState.turnStartTime = undefined;

    const room = await this.redisService.getRoom(roomId);
    if (room) {
      room.status = 'finished';
      room.finishedAt = new Date();
      room.winner = reason === 'winner' && gameState.winners ? gameState.winners[0]?.id : undefined;
      await this.redisService.setRoom(roomId, room);
      await this.redisService.publishRoomUpdate(roomId, room);
    }

    setTimeout(() => {
      this.startGame(roomId).catch((err) =>
        console.error(`Failed to auto-restart game ${roomId}`, err),
      );
    }, 5000);
  }


  // Методы управления таймерами
  startTurnTimer(roomId: string, playerId: string): void {
    this.clearTurnTimer(roomId); // Всегда очищаем предыдущий
    
    const timer = setTimeout(async () => {
      await this.handleAutoFold(roomId, playerId);
      this.turnTimers.delete(roomId);
    }, TURN_DURATION_SECONDS * 1000);
    
    this.turnTimers.set(roomId, timer);
  }

  clearTurnTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(roomId);
    }
  }

  hasActiveTimer(roomId: string): boolean {
    return this.turnTimers.has(roomId);
  }

  // Обработка автоматического fold по таймеру
  async handleAutoFold(
    roomId: string,
    playerId: string,
  ): Promise<GameActionResult> {
    const gameState = await this.redisService.getGameState(roomId);
    if (!gameState) {
      return { success: false, error: 'Игра не найдена' };
    }

    const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Игрок не найден' };
    }

    const player = gameState.players[playerIndex];
    if (!player || player.hasFolded || !player.isActive) {
      return { success: false, error: 'Игрок не активен' };
    }

    // Проверяем, что это действительно ход этого игрока
    if (gameState.currentPlayerIndex !== playerIndex) {
      return { success: false, error: 'Сейчас не ваш ход' };
    }
    
    // Если у игрока нет денег, автоматически делаем fold
    if (player.balance <= 0) {
      return this.handleFold(roomId, gameState, playerIndex);
    }
    
    // Выполняем автоматический fold
    return this.handleFold(roomId, gameState, playerIndex);
  }

  // Очистка всех таймеров
  clearAllTimers(): void {
    for (const [roomId, timer] of this.turnTimers) {
      clearTimeout(timer);
    }
    this.turnTimers.clear();
  }

}