/**
 * Zod schemas for REST API responses.
 *
 * Each schema is colocated with the matching TS interface in
 * `types/domain.ts` — the schemas are the *runtime* contract, the
 * interfaces are the *compile-time* contract.  Where the two need to
 * stay in sync, we use `satisfies z.ZodType<DomainType>` so a drift
 * fails the typecheck.
 *
 * Stage-2 contract: every REST endpoint that promises a domain type
 * also exposes its Zod schema here, and the client uses
 * `validateApiResponse(schema, raw)` before handing data to the store.
 */
import { z } from 'zod';

import type {
  DepositMethod,
  LeaderboardEntry,
  Room,
  Tournament,
  TournamentLeaderboardEntry,
  Transaction,
  User,
  WithdrawMethod,
} from '../../../types/domain';
import { MoneySchema } from '../shared';

export const UserSchema = z.object({
  name: z.string(),
  username: z.string(),
  avatar: z.string(),
  photo: z.string(),
  balance: MoneySchema,
  played: z.number().int().nonnegative(),
  won: z.number().int().nonnegative(),
  earned: MoneySchema,
  walletAddress: z.string().nullable(),
}) satisfies z.ZodType<User>;

export const RoomSchema = z.object({
  id: z.number().int(),
  num: z.number().int(),
  players: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  bet: MoneySchema,
  password: z.string().optional(),
  rakePercent: z.number().nonnegative().optional(),
  code: z.string().optional(),
}) satisfies z.ZodType<Room>;
export const RoomsListSchema = z.array(RoomSchema);

export const LeaderboardEntrySchema = z.object({
  pos: z.number().int().positive(),
  name: z.string(),
  avatar: z.string(),
  games: z.number().int().nonnegative(),
  wr: z.number(),
  earned: MoneySchema,
}) satisfies z.ZodType<LeaderboardEntry>;
export const LeaderboardSchema = z.array(LeaderboardEntrySchema);

export const TransactionTypeSchema = z.enum(['deposit', 'withdraw']);
export const TransactionStatusSchema = z.enum(['success', 'pending', 'failed']);
export const TransactionSchema = z.object({
  id: z.number().int(),
  type: TransactionTypeSchema,
  method: z.string(),
  amount: MoneySchema,
  date: z.string(),
  status: TransactionStatusSchema,
}) satisfies z.ZodType<Transaction>;
export const TransactionsListSchema = z.array(TransactionSchema);

export const TournamentStatusSchema = z.enum(['active', 'soon', 'ended']);
export const TournamentCoverSchema = z.enum(['chips', 'suits', 'ace', 'royal', 'aces']);
export const TournamentSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  prize: MoneySchema,
  entry: MoneySchema,
  players: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  startAt: z.date(),
  endAt: z.date(),
  status: TournamentStatusSchema,
  cover: TournamentCoverSchema,
}) satisfies z.ZodType<Tournament>;
export const TournamentsListSchema = z.array(TournamentSchema);

export const TournamentLeaderboardEntrySchema = z.object({
  pos: z.number().int().positive(),
  name: z.string(),
  avatar: z.string(),
  wins: z.number().int().nonnegative(),
  points: z.number(),
  prize: MoneySchema,
}) satisfies z.ZodType<TournamentLeaderboardEntry>;
export const TournamentLeaderboardSchema = z.array(TournamentLeaderboardEntrySchema);

export const DepositMethodSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
  rate: z.string(),
  hint: z.string(),
  network: z.string().nullable(),
  coin: z.string().nullable(),
  netName: z.string().nullable(),
}) satisfies z.ZodType<DepositMethod>;
export const DepositMethodsListSchema = z.array(DepositMethodSchema);

export const WithdrawMethodSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
  min: MoneySchema,
  fee: z.string(),
}) satisfies z.ZodType<WithdrawMethod>;
export const WithdrawMethodsListSchema = z.array(WithdrawMethodSchema);
