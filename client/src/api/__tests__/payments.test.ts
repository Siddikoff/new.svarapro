import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/telegram', () => ({
  getTelegramUserId: () => 12345,
  getTelegramUser: () => ({ first_name: 'Test', photo_url: '' }),
}));

import { __testing__, initiateDeposit, initiateWithdraw } from '../payments';

const { methodIdToCurrency, normalizeTransactionResponse, buildMockInstructions } =
  __testing__;

describe('methodIdToCurrency', () => {
  it.each([
    ['ton', 'TON'],
    ['usdt', 'USDTTON'],
  ])('maps %s to %s', (method, currency) => {
    expect(methodIdToCurrency(method)).toBe(currency);
  });

  it.each([['card'], [null], [undefined], ['weird']])(
    'returns null for unsupported method %s',
    (input) => {
      expect(methodIdToCurrency(input as string | null | undefined)).toBeNull();
    },
  );
});

describe('normalizeTransactionResponse', () => {
  it('reads the camelCase trackerId variant', () => {
    expect(
      normalizeTransactionResponse(
        { address: 'addr1', trackerId: 't-1' },
        'TON',
      ),
    ).toEqual({ address: 'addr1', trackerId: 't-1', currency: 'TON' });
  });

  it('falls back to snake_case tracker_id', () => {
    expect(
      normalizeTransactionResponse(
        { address: 'addr2', tracker_id: 't-2' },
        'USDTTON',
      ),
    ).toEqual({ address: 'addr2', trackerId: 't-2', currency: 'USDTTON' });
  });

  it('throws when the response is null', () => {
    expect(() => normalizeTransactionResponse(null, 'TON')).toThrow();
  });

  it('throws when address or tracker is missing', () => {
    expect(() =>
      normalizeTransactionResponse({ address: '', trackerId: 't' }, 'TON'),
    ).toThrow();
    expect(() =>
      normalizeTransactionResponse({ address: 'addr3' }, 'TON'),
    ).toThrow();
  });
});

describe('buildMockInstructions', () => {
  it('returns a TON-shaped address for the TON currency', () => {
    const result = buildMockInstructions('TON');
    expect(result.currency).toBe('TON');
    expect(result.address).toMatch(/^UQB/);
    expect(result.trackerId).toMatch(/^mock_/);
  });

  it('returns a TRX-shaped address for USDTTON', () => {
    const result = buildMockInstructions('USDTTON');
    expect(result.currency).toBe('USDTTON');
    expect(result.address).toMatch(/^TRX/);
  });
});

// ---------------------------------------------------------------------------
// initiate* — exercise the offline (no `VITE_API_BASE_URL`) and online
// paths separately. The online path is verified by stubbing `fetch` so
// we don't need a backend running in CI.
// ---------------------------------------------------------------------------

describe('initiateDeposit (offline / mock)', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Vite injects env vars onto `import.meta.env` — clearing the base
    // URL forces the offline branch.
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
  });

  it('returns the mock TON instructions when no backend is configured', async () => {
    const result = await initiateDeposit({ methodId: 'ton' });
    expect(result.currency).toBe('TON');
    expect(result.address).toBeTruthy();
    expect(result.trackerId).toBeTruthy();
  });

  it('rejects card method even offline', async () => {
    await expect(initiateDeposit({ methodId: 'card' })).rejects.toThrow(
      /Unsupported deposit method/,
    );
  });
});

describe('initiateDeposit (online)', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL =
      'https://api.test/v1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ address: 'UQ-server', trackerId: 't-server' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.assign(import.meta.env, originalEnv);
  });

  it('posts to /finances/transaction with the mapped currency', async () => {
    const result = await initiateDeposit({ methodId: 'usdt' });
    expect(result).toEqual({
      address: 'UQ-server',
      trackerId: 't-server',
      currency: 'USDTTON',
    });
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // `api/client.ts` captures BASE_URL on first module load, so once the
    // test suite is up `import.meta.env` overrides don't retroactively
    // re-prefix existing requests. The path itself is the contract we
    // care about — host gets stamped on by the deployed client.
    expect(String(url)).toContain('/finances/transaction');
    expect(init.method).toBe('POST');
    const parsed = JSON.parse(init.body as string);
    expect(parsed).toEqual({
      telegramId: '12345',
      currency: 'USDTTON',
      type: 'deposit',
    });
  });
});

describe('initiateWithdraw', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
  });

  it('returns a mock receipt offline', async () => {
    const receipt = await initiateWithdraw({
      methodId: 'usdt',
      amount: 50,
      address: 'TRX-addr',
    });
    expect(receipt.ok).toBe(true);
    expect(receipt.currency).toBe('USDTTON');
    expect(receipt.amount).toBe(50);
    expect(receipt.address).toBe('TRX-addr');
  });

  it('rejects unsupported methods', async () => {
    await expect(
      initiateWithdraw({ methodId: 'card', amount: 50, address: '1234' }),
    ).rejects.toThrow(/Unsupported withdraw method/);
  });

  it('rejects non-positive amounts', async () => {
    await expect(
      initiateWithdraw({ methodId: 'ton', amount: 0, address: 'UQ-addr' }),
    ).rejects.toThrow(/positive/);
  });

  it('rejects empty addresses', async () => {
    await expect(
      initiateWithdraw({ methodId: 'ton', amount: 5, address: '   ' }),
    ).rejects.toThrow(/address is required/);
  });
});
