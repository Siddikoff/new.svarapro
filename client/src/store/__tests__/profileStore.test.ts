import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/user', () => {
  return {
    fetchTransactions: vi.fn(),
    fetchReferralData: vi.fn(),
    saveWalletAddress: vi.fn(),
  };
});

import { fetchReferralData, fetchTransactions, saveWalletAddress } from '../../api/user';
import { useAuthStore } from '../authStore';
import { useProfileStore } from '../profileStore';

const fetchTransactionsMock = fetchTransactions as unknown as ReturnType<typeof vi.fn>;
const fetchReferralDataMock = fetchReferralData as unknown as ReturnType<typeof vi.fn>;
const saveWalletAddressMock = saveWalletAddress as unknown as ReturnType<typeof vi.fn>;

const resetProfileStore = () => {
  useProfileStore.setState({
    transactions: [],
    transactionsStatus: 'idle',
    transactionsError: null,
    referralData: null,
    referralStatus: 'idle',
    referralError: null,
    walletStatus: 'idle',
    walletError: null,
  });
};

beforeEach(() => {
  fetchTransactionsMock.mockReset();
  fetchReferralDataMock.mockReset();
  saveWalletAddressMock.mockReset();
  resetProfileStore();
  // Reset authStore wallet to a known starting value.
  useAuthStore.getState().setWalletAddress(null);
});

afterEach(() => {
  resetProfileStore();
});

describe('profileStore.loadTransactions', () => {
  it('loads transactions and transitions status to loaded', async () => {
    fetchTransactionsMock.mockResolvedValueOnce([
      {
        id: 1,
        type: 'deposit',
        method: 'TON',
        amount: 5,
        date: 'now',
        status: 'success',
      },
    ]);

    await useProfileStore.getState().loadTransactions();

    const state = useProfileStore.getState();
    expect(state.transactionsStatus).toBe('loaded');
    expect(state.transactions).toHaveLength(1);
    expect(state.transactionsError).toBeNull();
  });

  it('captures error and transitions status to error', async () => {
    fetchTransactionsMock.mockRejectedValueOnce(new Error('boom'));

    await useProfileStore.getState().loadTransactions();

    const state = useProfileStore.getState();
    expect(state.transactionsStatus).toBe('error');
    expect(state.transactionsError).toBeInstanceOf(Error);
    expect(state.transactions).toEqual([]);
  });
});

describe('profileStore.loadReferralData', () => {
  it('hydrates referralData on success', async () => {
    fetchReferralDataMock.mockResolvedValueOnce({
      referralLink: 'https://t.me/MySvaraBot?startapp=1',
      refBalance: 10,
      refBonus: 5,
      referralCount: 2,
      referrals: [{ username: 'a' }, { username: 'b' }],
    });

    await useProfileStore.getState().loadReferralData();

    const state = useProfileStore.getState();
    expect(state.referralStatus).toBe('loaded');
    expect(state.referralData?.referralLink).toContain('startapp=1');
    expect(state.referralData?.referrals).toHaveLength(2);
  });
});

describe('profileStore.saveWalletAddress', () => {
  it('persists via API and mirrors the value into authStore', async () => {
    saveWalletAddressMock.mockResolvedValueOnce(undefined);

    await useProfileStore.getState().saveWalletAddress('TRX-NEW');

    expect(saveWalletAddressMock).toHaveBeenCalledWith('TRX-NEW');
    expect(useAuthStore.getState().user.walletAddress).toBe('TRX-NEW');
    expect(useProfileStore.getState().walletStatus).toBe('loaded');
  });

  it('marks status=error and rethrows on API failure', async () => {
    saveWalletAddressMock.mockRejectedValueOnce(new Error('400'));

    await expect(
      useProfileStore.getState().saveWalletAddress('bad'),
    ).rejects.toThrow('400');

    expect(useProfileStore.getState().walletStatus).toBe('error');
    expect(useAuthStore.getState().user.walletAddress).toBeNull();
  });
});

describe('profileStore.clearWalletAddress', () => {
  it('zeroes the authStore wallet and resets walletStatus', () => {
    useAuthStore.getState().setWalletAddress('TRX-EXISTING');
    useProfileStore.setState({ walletStatus: 'loaded' });

    useProfileStore.getState().clearWalletAddress();

    expect(useAuthStore.getState().user.walletAddress).toBeNull();
    expect(useProfileStore.getState().walletStatus).toBe('idle');
  });
});
