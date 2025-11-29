export type Transaction = {
  type: 'deposit' | 'withdraw';
  currency: 'USDTTON' | 'TON';
  amount: number;
  status: 'canceled' | 'pending' | 'confirmed';
  tracker_id: string;
  createdAt: string;
};

export type UserData = {
  id?: number | string;
  username?: string;
  first_name?: string;
  photo_url?: string;
};

export interface UserProfile {
  id?: number;
  telegramId?: string;
  username?: string;
  avatar?: string | null;
  balance?: string | number;
  walletAddress?: string | null;
}

export type ApiError = {
  message?: string;
  response?: {
    data?: unknown;
    status?: number;
  };
} | string;

export type PageData = {
  address?: string;
  trackerId?: string;
  currency?: string;
  roomId?: string;
  [key: string]: unknown;
};

export type ReferralData = {
  referralLink?: string;
  refBalance?: string;
  refBonus?: string;
  referralCount?: number;
  referrals?: { username: string | null }[];
};
