import { Injectable } from '@nestjs/common';
import { Card } from '../../../types/game';

@Injectable()
export class CardService {
  // Создание колоды карт
  createDeck(): Card[] {
    const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = [
      'hearts',
      'diamonds',
      'clubs',
      'spades',
    ];
    const ranks: Array<'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7'> = [
      'A',
      'K',
      'Q',
      'J',
      '10',
      '9',
      '8',
      '7',
    ];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        const isJoker = suit === 'clubs' && rank === '7';
        const value = this.getCardValue(rank, suit);
        deck.push({ suit, rank, isJoker, value });
      }
    }

    return deck;
  }

  // Получение числового значения карты
  getCardValue(
    rank: string,
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
  ): number {
    if (rank === '7' && suit === 'clubs') {
      return 11;
    }
    switch (rank) {
      case 'A':
        return 11;
      case 'K':
      case 'Q':
      case 'J':
      case '10':
        return 10;
      default:
        return parseInt(rank);
    }
  }

  // Перемешивание колоды
  shuffleDeck(deck: Card[]): Card[] {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
  }

  // Раздача карт игрокам
  dealCards(
    deck: Card[],
    count: number,
  ): { cards: Card[]; remainingDeck: Card[] } {
    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);
    return { cards, remainingDeck };
  }

  // Расчет очков по комбинациям карт
  calculateScore(cards: Card[]): number {
    if (cards.length !== 3) {
      return 0;
    }

    // Проверяем специальные комбинации

    // Три семерки
    const allSevens = cards.every((card) => card.rank === '7');
    if (allSevens) {
      return 34; // Максимальное количество очков
    }

    // Три карты одного ранга
    const ranks = cards.map((card) => card.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size === 1) {
      return cards[0].value * 3;
    }

    // Две семерки
    const sevens = cards.filter((card) => card.rank === '7');
    if (sevens.length === 2) {
      return 23;
    }

    // Два туза
    const aces = cards.filter((card) => card.rank === 'A');
    if (aces.length === 2) {
      return 22;
    }

    // Проверяем карты одной масти
    const suits = cards.map((card) => card.suit);
    const suitCounts: { [key: string]: number } = {};
    for (const suit of suits) {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    }

    // Находим масть с максимальным количеством карт
    let maxSuit = '';
    let maxCount = 0;
    for (const suit in suitCounts) {
      if (suitCounts[suit] > maxCount) {
        maxCount = suitCounts[suit];
        maxSuit = suit;
      }
    }

    // Если есть джокер (7 треф)
    const joker = cards.find((card) => card.isJoker);

    if (maxCount === 3) {
      // Три карты одной масти
      return cards.reduce((sum, card) => sum + card.value, 0);
    } else if (maxCount === 2) {
      // Две карты одной масти
      const sameSuitCards = cards.filter((card) => card.suit === maxSuit);
      let score = sameSuitCards.reduce((sum, card) => sum + card.value, 0);

      // Если есть джокер и он не входит в комбинацию
      if (joker && joker.suit !== maxSuit) {
        score =
          Math.max(
            score,
            sameSuitCards.reduce((sum, card) => sum + card.value, 0) +
              joker.value,
          ) || 0;
      }

      return score;
    }

    // Если нет комбинаций, берем старшую карту
    return Math.max(...cards.map((card) => card.value));
  }
}
