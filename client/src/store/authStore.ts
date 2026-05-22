import { create } from 'zustand';

import { loginWithInitData } from '../api/auth';
import { setAuthToken } from '../api/client';
import { fetchCurrentUser } from '../api/user';
import { MOCK_USER } from '../data/mocks';
import { getTelegramAuthPayload } from '../services/telegram';
import type { User } from '../types/domain';

/**
 * authStore — current user + balance + JWT.
 *
 * Stage 2 wires this up to the real backend:
 *   - `login()` posts the Telegram `initData` to `/auth/login`, stores
 *     the JWT (and forwards it to `api/client`), then fetches the
 *     `/users/profile` payload.
 *   - `loadUser()` is kept for explicit refreshes (e.g. after a
 *     deposit/withdraw round-trip in Stage 5).
 *
 * Balance mutations stay optimistic: `creditBalance` / `debitBalance`
 * apply the delta immediately and return a `rollback` function so the
 * caller can revert the change if the server rejects the operation.
 */
export type BalanceRollback = () => void;

export interface AuthStoreState {
  user: User;
  token: string | null;
  /** Optional deep-link target from `/auth/login` (`ref{id}-room{id}`). */
  pendingRoomId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: unknown;
  login: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  creditBalance: (delta: number) => BalanceRollback;
  debitBalance: (delta: number) => BalanceRollback;
  /**
   * Mirror the saved USDT-TON withdrawal address locally so the Profile
   * screen reflects the new value immediately after `saveWalletAddress`
   * resolves. The server is the source of truth — this is just a
   * read-through cache.
   */
  setWalletAddress: (walletAddress: string | null) => void;
}

const round2 = (value: number): number => parseFloat(value.toFixed(2));

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: MOCK_USER,
  token: null,
  pendingRoomId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async () => {
    const payload = getTelegramAuthPayload();
    if (!payload) {
      // Running outside Telegram (dev preview) — stay on mocks.
      set({ isAuthenticated: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { accessToken, roomId } = await loginWithInitData(
        payload.initData,
        payload.startPayload,
      );
      setAuthToken(accessToken);
      const user = await fetchCurrentUser();
      set({
        token: accessToken,
        pendingRoomId: roomId ?? null,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuthToken(null);
      set({ isLoading: false, error, isAuthenticated: false, token: null });
    }
  },

  loadUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await fetchCurrentUser();
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error });
    }
  },

  clearError: () => set({ error: null }),

  creditBalance: (delta) => {
    const prevBalance = get().user.balance;
    set((state) => ({
      user: { ...state.user, balance: round2(state.user.balance + delta) },
    }));
    return () => set((state) => ({ user: { ...state.user, balance: prevBalance } }));
  },

  debitBalance: (delta) => {
    const prevBalance = get().user.balance;
    set((state) => ({
      user: { ...state.user, balance: round2(state.user.balance - delta) },
    }));
    return () => set((state) => ({ user: { ...state.user, balance: prevBalance } }));
  },

  setWalletAddress: (walletAddress) => {
    set((state) => ({ user: { ...state.user, walletAddress } }));
  },
}));
