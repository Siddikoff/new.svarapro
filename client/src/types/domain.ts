/**
 * Domain types shared across stores, API mocks, and components.
 *
 * Keeping these centralised (rather than colocated with stores) keeps the
 * dependency graph one-way: stores import from types, components import from
 * stores or types. Types never import from stores.
 */

export interface User {
  name: string;
  username: string;
  avatar: string;
  photo: string;
  balance: number;
  played: number;
  won: number;
  earned: number;
  /** Saved USDT-TON withdrawal address (null while empty/unsaved). */
  walletAddress: string | null;
}

export interface Room {
  /**
   * Server rooms use numeric IDs; client-created rooms use a string ID
   * minted by `generateClientId()` until the backend mints a real one.
   */
  id: number | string;
  num: number;
  players: number;
  max: number;
  bet: number;
  password?: string;
  /** House rake percent. Falls back to `DEFAULT_RAKE_PERCENT` when omitted. */
  rakePercent?: number;
  /** Optional share code used by the join-by-code flow. */
  code?: string;
}

export interface LeaderboardEntry {
  pos: number;
  name: string;
  avatar: string;
  games: number;
  wr: number;
  earned: number;
}

export type TransactionType = 'deposit' | 'withdraw';
export type TransactionStatus = 'success' | 'pending' | 'failed';

export interface Transaction {
  id: number;
  type: TransactionType;
  method: string;
  amount: number;
  date: string;
  status: TransactionStatus;
}

export type TournamentStatus = 'active' | 'soon' | 'ended';
export type TournamentCover = 'chips' | 'suits' | 'ace' | 'royal' | 'aces';

export interface Tournament {
  id: number;
  title: string;
  prize: number;
  entry: number;
  players: number;
  max: number;
  startAt: Date;
  endAt: Date;
  status: TournamentStatus;
  cover: TournamentCover;
}

export interface TournamentLeaderboardEntry {
  pos: number;
  name: string;
  avatar: string;
  wins: number;
  points: number;
  prize: number;
}

export interface DepositMethod {
  id: string;
  label: string;
  color: string;
  rate: string;
  hint: string;
  network: string | null;
  coin: string | null;
  netName: string | null;
}

export interface WithdrawMethod {
  id: string;
  label: string;
  color: string;
  min: number;
  fee: string;
}
