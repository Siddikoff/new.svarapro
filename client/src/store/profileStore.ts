/**
 * profileStore — auxiliary user data shown on the Profile screen.
 *
 * Keeps the `authStore` focused on identity (token, JWT, the slim
 * `User` record) by parking secondary data here:
 *   - `transactions`   — deposit / withdraw history (Finances controller)
 *   - `referralData`   — referral link + level summary (Users controller)
 *
 * Loaders are idempotent and tolerant of missing config: when
 * `VITE_API_BASE_URL` is empty (dev preview) the api layer returns
 * mocks / null, so the store just lands in the same "settled" state.
 *
 * Wallet address mutations live on `authStore.setWalletAddress` because
 * the wallet address is part of `User`; this store handles only the
 * REST call (`saveWalletAddress`) and propagates the result to auth.
 */
import { create } from 'zustand';

import {
  fetchReferralData,
  fetchTransactions,
  type ReferralData,
  saveWalletAddress as apiSaveWalletAddress,
} from '../api/user';
import type { Transaction } from '../types/domain';
import { useAuthStore } from './authStore';

export type ProfileLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface ProfileStoreState {
  transactions: Transaction[];
  transactionsStatus: ProfileLoadStatus;
  transactionsError: unknown;

  referralData: ReferralData | null;
  referralStatus: ProfileLoadStatus;
  referralError: unknown;

  walletStatus: ProfileLoadStatus;
  walletError: unknown;

  loadTransactions: () => Promise<void>;
  loadReferralData: () => Promise<void>;
  /**
   * Persist a new USDT-TON withdrawal address. On success, mirror the
   * value into `authStore` so any UI bound to `user.walletAddress`
   * updates immediately.
   */
  saveWalletAddress: (walletAddress: string) => Promise<void>;
  /**
   * Forget the saved address locally. The current backend has no DELETE
   * endpoint — calling this just clears the cached value so the UI
   * shows the empty state until the user enters a new one.
   */
  clearWalletAddress: () => void;
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  transactions: [],
  transactionsStatus: 'idle',
  transactionsError: null,

  referralData: null,
  referralStatus: 'idle',
  referralError: null,

  walletStatus: 'idle',
  walletError: null,

  loadTransactions: async () => {
    set({ transactionsStatus: 'loading', transactionsError: null });
    try {
      const transactions = await fetchTransactions();
      set({ transactions, transactionsStatus: 'loaded' });
    } catch (error) {
      set({ transactionsStatus: 'error', transactionsError: error });
    }
  },

  loadReferralData: async () => {
    set({ referralStatus: 'loading', referralError: null });
    try {
      const referralData = await fetchReferralData();
      set({ referralData, referralStatus: 'loaded' });
    } catch (error) {
      set({ referralStatus: 'error', referralError: error });
    }
  },

  saveWalletAddress: async (walletAddress) => {
    set({ walletStatus: 'loading', walletError: null });
    try {
      await apiSaveWalletAddress(walletAddress);
      useAuthStore.getState().setWalletAddress(walletAddress);
      set({ walletStatus: 'loaded' });
    } catch (error) {
      set({ walletStatus: 'error', walletError: error });
      throw error;
    }
  },

  clearWalletAddress: () => {
    useAuthStore.getState().setWalletAddress(null);
    set({ walletStatus: 'idle', walletError: null });
  },
}));
