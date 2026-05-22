import { describe, expect, it } from 'vitest';

import { __testing__ } from '../user';

const { mapServerProfileToUser, mapServerTransaction, formatTransactionDate } =
  __testing__;

describe('mapServerProfileToUser', () => {
  it('maps server profile to client User and prefixes username with @', () => {
    const result = mapServerProfileToUser({
      id: '42',
      telegramId: '777',
      username: 'alex',
      avatar: null,
      balance: 12.5,
      walletAddress: null,
    });

    // No Telegram context in vitest → falls back to profile.username ('alex').
    expect(result.name).toBe('alex');
    expect(result.username).toBe('@alex');
    expect(result.avatar).toBe('A');
    expect(result.balance).toBe(12.5);
    expect(result.played).toBe(0);
    expect(result.won).toBe(0);
    expect(result.earned).toBe(0);
    expect(result.walletAddress).toBeNull();
  });

  it('forwards walletAddress when present', () => {
    const result = mapServerProfileToUser({
      id: '1',
      telegramId: '777',
      username: null,
      avatar: null,
      balance: 0,
      walletAddress: 'TXYZ123',
    });

    expect(result.walletAddress).toBe('TXYZ123');
    expect(result.username).toBe('');
  });

  it('uses avatar URL when present and Telegram photo is absent', () => {
    const result = mapServerProfileToUser({
      id: '1',
      telegramId: '777',
      username: 'k',
      avatar: 'https://cdn.example/u.png',
      balance: 0,
      walletAddress: null,
    });

    expect(result.photo).toBe('https://cdn.example/u.png');
  });
});

describe('mapServerTransaction', () => {
  it('maps a confirmed deposit', () => {
    const tx = mapServerTransaction(
      {
        type: 'deposit',
        currency: 'TON',
        amount: '50.00',
        status: 'confirmed',
        tracker_id: 'abc',
        createdAt: '2025-04-12T14:32:00Z',
      },
      0,
    );

    expect(tx.id).toBe(1);
    expect(tx.type).toBe('deposit');
    expect(tx.method).toBe('TON');
    expect(tx.amount).toBe(50);
    expect(tx.status).toBe('success');
  });

  it('maps a canceled withdrawal to failed', () => {
    const tx = mapServerTransaction(
      {
        type: 'withdraw',
        currency: 'USDT',
        amount: 30,
        status: 'canceled',
        tracker_id: null,
        createdAt: '2025-04-12T14:32:00Z',
      },
      2,
    );

    expect(tx.id).toBe(3);
    expect(tx.type).toBe('withdraw');
    expect(tx.status).toBe('failed');
  });

  it('maps a pending status as-is', () => {
    const tx = mapServerTransaction(
      {
        type: 'deposit',
        currency: 'TON',
        amount: 1,
        status: 'pending',
        tracker_id: null,
        createdAt: '2025-04-12T14:32:00Z',
      },
      0,
    );

    expect(tx.status).toBe('pending');
  });

  it('falls back to deposit + pending for unknown values', () => {
    const tx = mapServerTransaction(
      {
        type: 'mystery',
        currency: '?',
        amount: 'NaN-like',
        status: 'who-knows',
        tracker_id: null,
        createdAt: '2025-04-12T14:32:00Z',
      },
      0,
    );

    expect(tx.type).toBe('deposit');
    expect(tx.status).toBe('pending');
    expect(tx.amount).toBe(0);
  });
});

describe('formatTransactionDate', () => {
  it('formats an ISO date into a human string', () => {
    const formatted = formatTransactionDate('2025-04-12T14:32:00Z');
    expect(formatted).toContain('2025');
  });

  it('returns the raw value when the date is invalid', () => {
    expect(formatTransactionDate('not-a-date')).toBe('not-a-date');
  });
});
