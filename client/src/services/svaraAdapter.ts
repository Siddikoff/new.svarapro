/**
 * Adapter between svarapro's `GameState` and the v143 client store.
 *
 * The svarapro NestJS server pushes `GameState` snapshots on
 * `game_state` (initial, single-recipient) and `game_update` (broadcast
 * to the room). v143's `gameStore` reads the simpler `RoomSnapshot`
 * shape from `shared/protocol`. This module is the only place the two
 * shapes meet — keep all the field-by-field mapping here so the rest of
 * the app stays protocol-agnostic.
 *
 * Mapping notes:
 *   - svarapro seats players by `position` (0..maxPlayers-1). v143
 *     keys its `SeatMap` by `SeatId` (string), so we stringify the
 *     position. `SeatId` is just a wire string in the schema.
 *   - svarapro's `status` is a richer enum (`ante`, `blind_betting`,
 *     `svara`, ...) than v143's `phase`. Map them to the closest v143
 *     phase so the existing reducer keeps working; the granular status
 *     is preserved on the player object for components that need it.
 *   - The receiving player's `hand` is included as long as the client
 *     filters its own seat (the server sends face-down cards for
 *     others). We forward `cards` as-is; the caller decides which seat
 *     is "me".
 */
import type {
  SvaraCard,
  SvaraCardSuit,
  SvaraGameState,
  SvaraGameStatus,
  SvaraPlayer,
} from '../api/svaraGame';
import type {
  Card,
  CardSuit,
  GamePhase,
  RoomStatePayload,
  SeatMap,
  SeatState,
} from '../shared/protocol';

// Map the svarapro server's fine-grained status enum onto the four
// coarse phases the v143 UI knows about. `svara_pending` doesn't
// have a 1:1 — it's a brief confirmation phase between rounds where
// the server waits for tied players to press join/decline. The UI
// has no dedicated phase for it, so we route it to `'showdown'`:
// hands are revealed, no one's on the bet clock, and the dedicated
// SvaraBanner overlay (driven by `subscribeToGameState` directly)
// renders on top to handle the actual decision.
const STATUS_TO_PHASE: Record<SvaraGameStatus, GamePhase> = {
  waiting: 'idle',
  ante: 'dealing',
  blind_betting: 'betting',
  betting: 'betting',
  showdown: 'showdown',
  svara: 'betting',
  svara_pending: 'showdown',
  finished: 'round_end',
};

/** v143's seat ids are strings. svarapro uses numeric positions 0..N-1. */
export const seatIdFromPosition = (position: number): string => String(position);

const SUIT_MAP: Record<SvaraCardSuit, CardSuit> = {
  spades: 'spade',
  hearts: 'heart',
  diamonds: 'diamond',
  clubs: 'club',
};

const adaptCard = (card: SvaraCard): Card => ({
  suit: SUIT_MAP[card.suit],
  rank: card.rank,
});

export interface AdaptPlayerOptions {
  /** Telegram id of the local user — controls whether `hand` is included. */
  selfTelegramId?: string;
  /** Whether the round is in showdown (everyone's cards are revealed). */
  showdown: boolean;
}

export const adaptPlayerToSeat = (
  player: SvaraPlayer,
  opts: AdaptPlayerOptions,
): SeatState => {
  const reveal = opts.showdown || player.id === opts.selfTelegramId;
  const seat: SeatState = {
    seatId: seatIdFromPosition(player.position),
    telegramId: player.id,
    name: player.username,
    photo: player.avatar ?? undefined,
    stack: player.balance,
    bet: player.currentBet,
    folded: player.hasFolded,
    dealer: player.isDealer,
    cardCount: player.cards.length,
    hasLooked: player.hasLooked,
    hasLookedAndMustAct: player.hasLookedAndMustAct,
  };
  // `player.score` is only set after the server computes it (`look`,
  // showdown, svara resolution). Skip the field entirely while it's
  // still the default `0` so opponents don't paint "0" badges on top
  // of face-down hands. Also gate on `reveal` so opponents' scores
  // don't leak to the local client between the server-side score
  // computation (which happens as soon as a player taps «Open» /
  // «Look») and the actual showdown reveal — by Svara rules nobody
  // sees an opponent's hand strength before cards turn face-up.
  if (reveal && typeof player.score === 'number' && player.score > 0) {
    seat.score = player.score;
  }
  // Forward the server-authoritative round payout so the winner badge
  // can show the real number (pot − rake, or per-share for splits).
  // Only set when present and > 0 so the field never paints a stale
  // "+$0" badge during the next round before the server resets it.
  if (typeof player.lastWinAmount === 'number' && player.lastWinAmount > 0) {
    seat.lastWinAmount = player.lastWinAmount;
  }
  // Folded players keep their cards face-down even at showdown — by Svara
  // rules a hand is only revealed if its owner stayed in the round and made
  // it to the actual comparison. Skipping the `hand` here keeps `seat.hand`
  // unset for folded seats so the client never paints them face-up.
  if (reveal && !player.hasFolded && player.cards.length > 0) {
    seat.hand = player.cards.map(adaptCard);
  }
  return seat;
};

export interface AdaptGameStateOptions {
  /** Telegram id of the local user — controls hand visibility per seat. */
  selfTelegramId?: string;
  /**
   * Optional monotonically increasing version to pass through to the
   * store's reconciliation. The svarapro server doesn't ship a version,
   * so callers usually pass `Date.now()` or a local counter.
   */
  version?: number;
}

/**
 * Adapt a full svarapro `GameState` into a v143 `RoomStatePayload`.
 *
 * The result is suitable for `useGameStore.getState().applySnapshot(...)`.
 */
export const adaptGameStateToSnapshot = (
  state: SvaraGameState,
  opts: AdaptGameStateOptions = {},
): RoomStatePayload => {
  const showdown =
    state.status === 'showdown' ||
    state.status === 'finished' ||
    state.status === 'svara' ||
    state.status === 'svara_pending';

  const seats: SeatMap = {};
  for (const player of state.players) {
    const seat = adaptPlayerToSeat(player, {
      selfTelegramId: opts.selfTelegramId,
      showdown,
    });
    seats[seatIdFromPosition(player.position)] = seat;
  }

  const activePlayer = state.players[state.currentPlayerIndex];
  const winner = state.winners[0];

  // Whether the active phase is one where a player is actually on the
  // clock. Outside of these, the turn ring is hidden and the timer
  // should not run — carry `null` so the store wipes any stale value.
  const isOnClock =
    state.status === 'betting' ||
    state.status === 'blind_betting' ||
    state.status === 'svara';

  return {
    seats,
    pot: state.pot,
    phase: STATUS_TO_PHASE[state.status],
    // `currentPlayerIndex` is set even in `waiting` (the dealer is
    // chosen up front). Surface `activeSeatId` only while a player is
    // actually on the clock, otherwise the client lights up the turn
    // ring and starts a 15s timeout for the single player in an empty
    // room.
    activeSeatId:
      isOnClock && activePlayer
        ? seatIdFromPosition(activePlayer.position)
        : null,
    winnerId: winner ? seatIdFromPosition(winner.position) : null,
    version: opts.version,
    minBet: state.minBet,
    currentBet: state.currentBet,
    lastBlindBet: state.lastBlindBet,
    lastActionAmount: state.lastActionAmount,
    // Only forward the turn clock while someone is actually on it; the
    // store treats `null` as "no clock running".
    turnStartTime: isOnClock ? state.turnStartTime ?? null : null,
    turnDurationMs:
      typeof state.timer === 'number' ? state.timer * 1000 : undefined,
  };
};
