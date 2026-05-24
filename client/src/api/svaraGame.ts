/**
 * TypeScript shapes that match the svarapro NestJS server.
 *
 * Mirrors `server/src/modules/game/...` and the wire-format types used
 * by `game.gateway.ts` (event names `game_state`, `game_update`,
 * `game_action`, `chat_message`, `sit_down`, `join_room`, `leave_room`).
 *
 * Kept in `api/` rather than `shared/protocol/` because:
 *   - These types describe what the *backend* sends today; the v143
 *     `shared/protocol` describes the canonical client-side shape.
 *   - The adapter in `services/svaraAdapter.ts` is the bridge between
 *     the two, so the boundary is explicit and easy to grep for.
 *
 * Source of truth: `server/src/modules/game/...` and the legacy svarapro
 * client (`client/src/types/game.tsx` on the `chore/import-svarapro-baseline`
 * branch before the v143 redesign).
 */

export type SvaraRoomStatus = 'waiting' | 'playing' | 'finished';

export type SvaraGameStatus =
  | 'waiting'
  | 'ante'
  | 'blind_betting'
  | 'betting'
  | 'showdown'
  | 'svara'
  | 'svara_pending'
  | 'finished';

export type SvaraCardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type SvaraCardRank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';

export interface SvaraCard {
  suit: SvaraCardSuit;
  rank: SvaraCardRank;
  /** True only for the 7 of clubs in the svara variant. */
  isJoker?: boolean;
  value: number;
}

/**
 * Player actions accepted by the svarapro server's `game_action`
 * handler (`server/src/modules/game/services/game.service.ts:525-548`).
 * `'check'` was previously in this union but the server has no
 * corresponding case — sending it just produced a Russian
 * "Недопустимое действие" toast — so it's removed here to prevent
 * future code from accidentally emitting it.
 *
 * (`'blind'` is the wrong literal — the server only accepts
 * `'blind_bet'` — but that rename ships in a sibling PR to keep this
 * change focused on the dead-code removal.)
 */
export type SvaraPlayerAction =
  | 'fold'
  | 'call'
  | 'raise'
  | 'blind_bet'
  | 'look';

export interface SvaraPlayer {
  /** Telegram user id as a string. */
  id: string;
  username: string;
  avatar: string | null;
  /** Off-table balance (wallet). */
  balance: number;
  /** Chips on the table for this player. */
  tableBalance: number;
  cards: SvaraCard[];
  isActive: boolean;
  isDealer: boolean;
  hasFolded: boolean;
  hasLooked: boolean;
  currentBet: number;
  totalBet: number;
  /** Points computed at showdown. */
  score?: number;
  /** Seat position around the table (0..maxPlayers-1). */
  position: number;
  lastAction?: SvaraPlayerAction;
  hasLookedAndMustAct?: boolean;
  lastWinAmount?: number;
  inactivityCount?: number;
  /** Server-suggested action names available to the player right now. */
  availableActions?: string[];
}

export type SvaraGameActionType =
  | 'join'
  | 'leave'
  | 'ante'
  | 'blind_bet'
  | 'look'
  | 'bet'
  | 'call'
  | 'raise'
  | 'fold'
  | 'win'
  | 'svara'
  | 'return_bet';

export interface SvaraGameAction {
  type: SvaraGameActionType;
  telegramId: string;
  amount?: number;
  timestamp: number;
  message?: string;
}

export interface SvaraGameState {
  roomId: string;
  status: SvaraGameStatus;
  players: SvaraPlayer[];
  pot: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  lastRaiseIndex?: number;
  lastBlindBettorIndex?: number;
  minBet: number;
  currentBet: number;
  lastBlindBet: number;
  lastActionAmount: number;
  rake: number;
  winners: SvaraPlayer[];
  isSvara: boolean;
  svaraParticipants?: string[];
  svaraConfirmed?: string[];
  svaraDeclined?: string[];
  hasRaiseMax?: boolean;
  raiseMaxPlayerIndex?: number;
  round: number;
  timer?: number;
  /** Server `Date.now()` when the current turn started. */
  turnStartTime?: number;
  log: SvaraGameAction[];
  isAnimating?: boolean;
  animationType?: 'chip_fly' | 'win_animation';
  showWinnerAnimation?: boolean;
  chipCount?: number;
}

/** Client → server frame for `game_action`. */
export interface SvaraGameActionRequest {
  roomId: string;
  action: SvaraPlayerAction | 'open' | 'all_in';
  amount?: number;
}

/** Client → server frame for `chat_message`. */
export interface SvaraChatMessageRequest {
  roomId: string;
  phrase: string;
}

/** Server → client frame for `new_chat_message`. */
export interface SvaraChatMessageEvent {
  playerId: string;
  phrase: string;
}

/** Server → client frame for `balanceUpdated`. */
export interface SvaraBalanceUpdatedEvent {
  /** Balance is stringified by the server because it's a decimal. */
  balance: string;
}

/** Server → client frame for `error`. */
export interface SvaraServerErrorEvent {
  message: string;
}

/** Client → server frame for `sit_down`. */
export interface SvaraSitDownRequest {
  roomId: string;
  position: number;
  userData: {
    username: string;
    avatar: string;
  };
}
