// 32-card "Свара" deck (ранги 7..A в четырёх мастях).
//
// Pure, framework-agnostic helpers — no React, no DOM. The GameRoom screen
// uses these to mock a dealt hand until the backend takes over.

export type CardRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardSuit = 'spade' | 'heart' | 'diamond' | 'club';

export interface Card {
  rank: CardRank;
  suit: CardSuit;
}

export const RANKS: readonly CardRank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

// Suit identifiers match `PlayingCard` / `SuitShape` props.
export const SUITS: readonly CardSuit[] = ['spade', 'heart', 'diamond', 'club'] as const;

// Vite resolves these to final hashed URLs at build time. The glob keys
// look like `../../assets/cards/A-heart.png` (this file lives in
// `src/features/gameRoom/`, the PNGs live in `src/assets/cards/`), so we
// index that map directly when asking for a card's asset URL — no fetch,
// no React state.
const CARD_IMAGES = import.meta.glob('../../assets/cards/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function cardImageUrl(card: Card | null | undefined): string | undefined {
  if (!card) return undefined;
  return CARD_IMAGES[`../../assets/cards/${card.rank}-${card.suit}.png`];
}

// Warm the HTTP cache for every card PNG. The "Открыть" reveal flips a card
// face-up over ~560ms; on a cold cellular cache the browser starts fetching
// the front-face image only when the <img src> first mounts, which can land
// AFTER the flip has already crossed 90deg — the user sees a blank/half-loaded
// card mid-flip. Calling this once on room entry primes the cache so the
// reveal is glitch-free regardless of which 3 cards are dealt.
//
// Safe to call repeatedly — `new Image()` shares the browser's resource cache,
// so subsequent calls are no-ops once the assets are cached.
let cardsPreloaded = false;
export function preloadCardImages(): void {
  if (cardsPreloaded) return;
  if (typeof Image === 'undefined') return;
  cardsPreloaded = true;
  for (const url of Object.values(CARD_IMAGES)) {
    const img = new Image();
    img.src = url;
  }
}

export function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (let r = 0; r < RANKS.length; r += 1) {
    for (let s = 0; s < SUITS.length; s += 1) {
      cards.push({ rank: RANKS[r], suit: SUITS[s] });
    }
  }
  return cards;
}

// Fisher–Yates. Returns a new array; the input is left untouched.
export function shuffleDeck(deck: Card[] = buildDeck()): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Deal `n` cards off the top of a freshly shuffled deck.
export function dealHand(n: number = 3): Card[] {
  return shuffleDeck().slice(0, n);
}

// Numeric value of a card for Свара scoring. A=11, K/Q/J/10=10, 9..7=face.
function rankValue(rank: CardRank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
  return Number(rank);
}

// Очко (point) for a 3-card Свара hand. Mirrors the backend's
// `card.service.calculateScore` (server/src/modules/game/services/card.service.ts)
// so the score badge the client paints matches the score the server
// uses to settle the pot. Key combinations:
//
//   * три семёрки (7♥/7♦/7♠/7♣)                    → 34 (max)
//   * три карты одного ранга                       → value × 3
//                                                    (тройка тузов = 33,
//                                                     тройка королей = 30, …)
//   * две семёрки (без тройки)                     → 23
//   * два туза   (без тройки)                      → 22
//   * три карты одной масти                        → сумма (7..31)
//   * две карты одной масти                        → сумма обеих
//   * иначе                                        → старшая карта
//
// Если карт меньше трёх — возвращаем сумму одномастных по тем картам, что
// есть, что удобно для UI: счётчик начинает что-то показывать, как только
// игрок раскрывает руку, даже если по какой-то причине пришло меньше карт.
//
// NOTE: backend also handles the 7♣ joker substitution rule, but the
// frontend's `Card` type has no `isJoker` field — the 7♣ is just a
// regular 7. That means this function disagrees with the backend on
// hands where the joker substitution actually pays off; rely on the
// authoritative `player.score` from the snapshot whenever it's
// available (forwarded through `SeatState.score` since the v144
// adapter change).
export function svaraHandScore(cards: Card[] | null | undefined): number {
  if (!cards || cards.length === 0) return 0;

  if (cards.length >= 3) {
    const allSevens = cards.every((c) => c.rank === '7');
    if (allSevens) return 34;

    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      return rankValue(cards[0].rank) * 3;
    }

    const sevens = cards.filter((c) => c.rank === '7').length;
    if (sevens === 2) return 23;

    const aces = cards.filter((c) => c.rank === 'A').length;
    if (aces === 2) return 22;
  }

  const suitSums: Record<CardSuit, number> = {
    spade: 0,
    heart: 0,
    diamond: 0,
    club: 0,
  };
  const suitCounts: Record<CardSuit, number> = {
    spade: 0,
    heart: 0,
    diamond: 0,
    club: 0,
  };
  for (const c of cards) {
    suitSums[c.suit] += rankValue(c.rank);
    suitCounts[c.suit] += 1;
  }
  let bestSuitCount = 0;
  let bestSuitSum = 0;
  for (const s of SUITS) {
    if (suitCounts[s] > bestSuitCount) {
      bestSuitCount = suitCounts[s];
      bestSuitSum = suitSums[s];
    }
  }
  if (bestSuitCount >= 2) return bestSuitSum;
  // No matching suits — fall back to the highest single card value.
  return Math.max(...cards.map((c) => rankValue(c.rank)));
}
