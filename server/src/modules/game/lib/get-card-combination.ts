import { Card } from '../../../types/game';

const getCardValue = (card: Card): number => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
};

const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => getCardValue(b) - getCardValue(a));
};

export const getCardCombination = (
  hand: Card[],
): { name: string; rank: number; value: number } => {
  if (hand.length !== 3) {
    return { name: 'Неполная рука', rank: 0, value: 0 };
  }

  const sortedHand = sortCards(hand);
  const [card1, card2, card3] = sortedHand;

  const isSameSuit =
    card1.suit === card2.suit && card2.suit === card3.suit;
  const isSameRank =
    card1.rank === card2.rank && card2.rank === card3.rank;

  if (isSameRank && card1.rank === 'A') {
    return { name: 'Три туза', rank: 10, value: 33 };
  }

  if (isSameRank) {
    const value = getCardValue(card1) * 3;
    return { name: `Тройка ${card1.rank}`, rank: 9, value };
  }

  if (isSameSuit) {
    const value =
      getCardValue(card1) + getCardValue(card2) + getCardValue(card3);
    return { name: 'Свара', rank: 8, value };
  }

  if (card1.suit === card2.suit) {
    return {
      name: 'Две карты',
      rank: 7,
      value: getCardValue(card1) + getCardValue(card2),
    };
  }
  if (card1.suit === card3.suit) {
    return {
      name: 'Две карты',
      rank: 7,
      value: getCardValue(card1) + getCardValue(card3),
    };
  }
  if (card2.suit === card3.suit) {
    return {
      name: 'Две карты',
      rank: 7,
      value: getCardValue(card2) + getCardValue(card3),
    };
  }

  if (card1.rank === card2.rank) {
    return { name: `Пара ${card1.rank}`, rank: 6, value: getCardValue(card1) * 2 };
  }
  if (card1.rank === card3.rank) {
    return { name: `Пара ${card1.rank}`, rank: 6, value: getCardValue(card1) * 2 };
  }
  if (card2.rank === card3.rank) {
    return { name: `Пара ${card2.rank}`, rank: 6, value: getCardValue(card2) * 2 };
  }

  const value = getCardValue(card1);
  return { name: `Старшая карта ${card1.rank}`, rank: 1, value };
};
