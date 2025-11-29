import { GameState, Player } from '../../../types/game';
import { Player as PlayerEntity } from '../../../entities/player.entity';
import { generateDeck, shuffleDeck, dealCards } from './deck'; // I assume deck logic is fine.

export const getNewGame = (
  roomId: string,
  players: PlayerEntity[],
  minBet: number,
  previousDealerId?: string,
): GameState => {
  const deck = shuffleDeck(generateDeck());
  const dealtCards = dealCards(deck, players.length);

  const gamePlayers: Player[] = players.map((p, index) => ({
    id: p.telegramId.toString(),
    username: p.username,
    avatar: p.avatarUrl,
    balance: p.balance,
    position: index, // This should be based on their actual seat
    cards: dealtCards[index],
    isActive: true,
    hasFolded: false,
    hasLooked: false,
    totalBet: 0,
    // Properties from the official type that need a default value
    tableBalance: p.balance, // Assuming tableBalance starts equal to balance
    isDealer: false,
    score: 0,
    availableActions: [],
  }));

  // Determine the dealer index
  let dealerIndex: number;
  if (previousDealerId) {
    const previousDealerIndex = gamePlayers.findIndex(
      (p) => p.id === previousDealerId,
    );
    // Simple increment and wrap around.
    dealerIndex = (previousDealerIndex + 1) % gamePlayers.length;
  } else {
    dealerIndex = Math.floor(Math.random() * gamePlayers.length);
  }

  if (gamePlayers[dealerIndex]) {
    gamePlayers[dealerIndex].isDealer = true;
  }

  return {
    roomId,
    status: 'ante',
    players: gamePlayers,
    pot: 0,
    deck: deck, // Deck should be part of the state
    minBet,
    dealerIndex: dealerIndex,
    currentPlayerIndex: -1, // Turn will be set after antes
    currentBet: 0,
    lastBlindBet: 0,
    lastActionAmount: 0,
    rake: 0,
    winners: [],
    isSvara: false,
    hasRaiseMax: false, // ИСПРАВЛЕНИЕ: Сбрасываем флаг raise max при новой игре
    raiseMaxPlayerIndex: undefined, // ИСПРАВЛЕНИЕ: Сбрасываем индекс raise max игрока
    round: 1,
    log: [],
    chipCount: 0,
  };
};
