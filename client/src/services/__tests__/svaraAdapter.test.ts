import { describe, expect, it } from 'vitest';

import type {
  SvaraGameState,
  SvaraPlayer,
} from '../../api/svaraGame';
import {
  adaptGameStateToSnapshot,
  adaptPlayerToSeat,
  seatIdFromPosition,
} from '../svaraAdapter';

const player = (overrides: Partial<SvaraPlayer> = {}): SvaraPlayer => ({
  id: '111',
  username: 'alice',
  avatar: 'https://example.com/a.png',
  balance: 500,
  tableBalance: 100,
  cards: [],
  isActive: true,
  isDealer: false,
  hasFolded: false,
  hasLooked: false,
  currentBet: 0,
  totalBet: 0,
  position: 0,
  ...overrides,
});

const state = (overrides: Partial<SvaraGameState> = {}): SvaraGameState => ({
  roomId: '42',
  status: 'betting',
  players: [],
  pot: 0,
  currentPlayerIndex: 0,
  dealerIndex: 0,
  minBet: 1,
  currentBet: 0,
  lastBlindBet: 0,
  lastActionAmount: 0,
  rake: 0,
  winners: [],
  isSvara: false,
  round: 1,
  log: [],
  ...overrides,
});

describe('seatIdFromPosition', () => {
  it('stringifies the numeric seat position', () => {
    expect(seatIdFromPosition(0)).toBe('0');
    expect(seatIdFromPosition(5)).toBe('5');
  });
});

describe('adaptPlayerToSeat', () => {
  it('omits the hand for other players outside showdown', () => {
    const seat = adaptPlayerToSeat(
      player({
        id: '222',
        position: 3,
        cards: [
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'spades', rank: 'K', value: 13 },
          { suit: 'clubs', rank: 'Q', value: 12 },
        ],
      }),
      { selfTelegramId: '111', showdown: false },
    );
    expect(seat.seatId).toBe('3');
    expect(seat.cardCount).toBe(3);
    expect(seat.hand).toBeUndefined();
  });

  it('reveals the hand for the local player', () => {
    const seat = adaptPlayerToSeat(
      player({
        id: '111',
        position: 2,
        cards: [{ suit: 'diamonds', rank: '7', value: 7 }],
      }),
      { selfTelegramId: '111', showdown: false },
    );
    expect(seat.hand).toEqual([{ suit: 'diamond', rank: '7' }]);
  });

  it('reveals every hand at showdown', () => {
    const seat = adaptPlayerToSeat(
      player({
        id: '222',
        position: 1,
        cards: [{ suit: 'clubs', rank: 'J', value: 11 }],
      }),
      { selfTelegramId: '111', showdown: true },
    );
    expect(seat.hand).toEqual([{ suit: 'club', rank: 'J' }]);
  });

  it('forwards stack / bet / folded / dealer flags', () => {
    const seat = adaptPlayerToSeat(
      player({
        position: 4,
        tableBalance: 250,
        currentBet: 30,
        hasFolded: true,
        isDealer: true,
      }),
      { selfTelegramId: 'unused', showdown: false },
    );
    expect(seat).toMatchObject({
      seatId: '4',
      stack: 250,
      bet: 30,
      folded: true,
      dealer: true,
    });
  });
});

describe('adaptGameStateToSnapshot', () => {
  it('maps every player into the seats map keyed by position', () => {
    const snapshot = adaptGameStateToSnapshot(
      state({
        pot: 90,
        currentPlayerIndex: 1,
        players: [
          player({ id: '111', position: 0, username: 'a' }),
          player({ id: '222', position: 2, username: 'b' }),
        ],
      }),
      { selfTelegramId: '111', version: 7 },
    );
    expect(Object.keys(snapshot.seats)).toEqual(['0', '2']);
    expect(snapshot.pot).toBe(90);
    expect(snapshot.version).toBe(7);
    expect(snapshot.activeSeatId).toBe('2');
  });

  it('maps server status to v143 phase', () => {
    expect(adaptGameStateToSnapshot(state({ status: 'waiting' })).phase).toBe('idle');
    expect(adaptGameStateToSnapshot(state({ status: 'ante' })).phase).toBe('dealing');
    expect(adaptGameStateToSnapshot(state({ status: 'blind_betting' })).phase).toBe('betting');
    expect(adaptGameStateToSnapshot(state({ status: 'betting' })).phase).toBe('betting');
    expect(adaptGameStateToSnapshot(state({ status: 'showdown' })).phase).toBe('showdown');
    expect(adaptGameStateToSnapshot(state({ status: 'svara' })).phase).toBe('betting');
    // `svara_pending` is the brief decision window between rounds —
    // hands are revealed, no bet clock. The UI has no dedicated phase
    // for it so we route it to `showdown`; the SvaraBanner overlay
    // handles the actual join/skip decision separately.
    expect(adaptGameStateToSnapshot(state({ status: 'svara_pending' })).phase).toBe(
      'showdown',
    );
    expect(adaptGameStateToSnapshot(state({ status: 'finished' })).phase).toBe('round_end');
  });

  it('reveals all hands at showdown regardless of selfTelegramId', () => {
    const snapshot = adaptGameStateToSnapshot(
      state({
        status: 'showdown',
        players: [
          player({
            id: '999',
            position: 0,
            cards: [{ suit: 'spades', rank: 'A', value: 14 }],
          }),
        ],
      }),
      { selfTelegramId: '111' },
    );
    expect(snapshot.seats['0']?.hand).toEqual([{ suit: 'spade', rank: 'A' }]);
  });

  it('returns winnerId from the first entry in winners[]', () => {
    const snapshot = adaptGameStateToSnapshot(
      state({
        status: 'finished',
        winners: [player({ position: 3 })],
      }),
    );
    expect(snapshot.winnerId).toBe('3');
  });

  it('returns null winnerId when no winners are present', () => {
    const snapshot = adaptGameStateToSnapshot(state());
    expect(snapshot.winnerId).toBeNull();
  });
});
