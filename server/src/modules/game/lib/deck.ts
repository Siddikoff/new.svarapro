import { Card } from '../../../types/game';

export const generateDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Card['rank'][] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: 0 }); // Value will be calculated later
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealCards = (deck: Card[], numPlayers: number): Card[][] => {
  const hands: Card[][] = Array(numPlayers).fill(0).map(() => []);
  // The deck is modified by pop(), so we need a copy if we want to preserve the original deck.
  const deckCopy = [...deck];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < numPlayers; j++) {
      const card = deckCopy.pop();
      if (card) {
        hands[j].push(card);
      }
    }
  }
  return hands;
};
