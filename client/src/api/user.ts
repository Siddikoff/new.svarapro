/**
 * User profile, wallet address, referral data & transaction history.
 *
 * The svarapro NestJS backend exposes a handful of endpoints scattered
 * across the `users` and `finances` modules — this file unifies them as
 * a single API surface so the rest of the client doesn't care which
 * controller a piece of data lives on.
 *
 *   GET    /users/profile               (JWT) — { id, telegramId, username, avatar, balance, walletAddress }
 *   POST   /users/wallet-address        (JWT) — body { walletAddress }
 *   GET    /users/referral-link         (JWT) — { referralLink, refBalance, refBonus, referralCount, referrals }
 *   GET    /finances/history/all/:tgId  (public-ish by telegramId)
 *
 * v143's `User` type carries a couple of extra fields (`name`, `played`,
 * `won`, `earned`) — `name` is synthesised from Telegram, the aggregate
 * game stats stay at 0 until the server exposes them. `walletAddress`
 * is forwarded as-is so the WalletSheet can show / edit it.
 */
import { MOCK_TRANSACTIONS, MOCK_USER } from '../data/mocks';
import { getTelegramUser, getTelegramUserId } from '../services/telegram';
import type { Transaction, User } from '../types/domain';
import { httpRequest } from './client';

interface ServerProfile {
  id: string;
  telegramId: string;
  username: string | null;
  avatar: string | null;
  balance: number;
  walletAddress: string | null;
}

export interface ServerReferralEntry {
  username: string | null;
}

export interface ReferralData {
  referralLink: string;
  refBalance: number;
  refBonus: number;
  referralCount: number;
  referrals: ServerReferralEntry[];
}

interface ServerReferralResponse {
  referralLink: string;
  refBalance: string | number;
  refBonus: string | number;
  referralCount: number;
  referrals: ServerReferralEntry[];
}

interface ServerTransaction {
  type: 'deposit' | 'withdraw' | string;
  currency: string;
  amount: number | string;
  status: 'confirmed' | 'canceled' | 'pending' | string;
  tracker_id: string | null;
  createdAt: string;
  fiat_amount?: number | string | null;
}

const apiConfigured = (): boolean => Boolean(import.meta.env?.VITE_API_BASE_URL);

const mapServerProfileToUser = (profile: ServerProfile): User => {
  const telegramUser = getTelegramUser();
  const firstName = telegramUser?.first_name ?? profile.username ?? 'Player';
  const initial = firstName.charAt(0).toUpperCase();
  const photo = telegramUser?.photo_url ?? profile.avatar ?? '';

  return {
    name: firstName,
    username: profile.username ? `@${profile.username}` : '',
    avatar: initial,
    photo,
    balance: profile.balance,
    // Server doesn't expose aggregate game stats yet — kept at 0 so the
    // profile screen still renders. Future PR will replace these with
    // values derived from `/finances/history/all/:userId` and the
    // gameplay tables once they exist.
    played: 0,
    won: 0,
    earned: 0,
    walletAddress: profile.walletAddress,
  };
};

const toNumber = (value: string | number | null | undefined): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const STATUS_MAP: Record<string, Transaction['status']> = {
  confirmed: 'success',
  complete: 'success',
  success: 'success',
  pending: 'pending',
  canceled: 'failed',
  cancelled: 'failed',
  failed: 'failed',
};

const TYPE_MAP: Record<string, Transaction['type']> = {
  deposit: 'deposit',
  withdraw: 'withdraw',
  withdrawal: 'withdraw',
};

const FALLBACK_TYPE: Transaction['type'] = 'deposit';
const FALLBACK_STATUS: Transaction['status'] = 'pending';

const formatTransactionDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const mapServerTransaction = (
  serverTx: ServerTransaction,
  index: number,
): Transaction => ({
  // Server transactions don't ship a stable numeric id in the trimmed
  // history payload — fall back to a positional id so React keys stay
  // stable for the lifetime of the list.
  id: index + 1,
  type: TYPE_MAP[serverTx.type] ?? FALLBACK_TYPE,
  method: serverTx.currency,
  amount: toNumber(serverTx.amount),
  date: formatTransactionDate(serverTx.createdAt),
  status: STATUS_MAP[serverTx.status] ?? FALLBACK_STATUS,
});

export const fetchCurrentUser = async (): Promise<User> => {
  if (!apiConfigured()) return MOCK_USER;

  const profile = await httpRequest<ServerProfile>('/users/profile');
  if (!profile) return MOCK_USER;
  return mapServerProfileToUser(profile);
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (!apiConfigured()) return MOCK_TRANSACTIONS;

  const tgId = getTelegramUserId();
  if (tgId == null) return MOCK_TRANSACTIONS;

  const list = await httpRequest<ServerTransaction[]>(
    `/finances/history/all/${tgId}`,
  );
  if (!Array.isArray(list)) return [];
  return list.map(mapServerTransaction);
};

export const fetchReferralData = async (): Promise<ReferralData | null> => {
  if (!apiConfigured()) return null;

  const response = await httpRequest<ServerReferralResponse>(
    '/users/referral-link',
  );
  if (!response) return null;

  return {
    referralLink: response.referralLink,
    refBalance: toNumber(response.refBalance),
    refBonus: toNumber(response.refBonus),
    referralCount: response.referralCount,
    referrals: response.referrals ?? [],
  };
};

export const saveWalletAddress = async (
  walletAddress: string,
): Promise<void> => {
  if (!apiConfigured()) return;

  await httpRequest('/users/wallet-address', {
    method: 'POST',
    body: { walletAddress },
  });
};

/** Internal helpers exported for unit tests. */
export const __testing__ = {
  mapServerProfileToUser,
  mapServerTransaction,
  formatTransactionDate,
};
