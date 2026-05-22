/**
 * Payments API (deposit / withdraw).
 *
 * Stage 5 wires the v143 deposit + withdraw UI to the real svarapro
 * NestJS backend. The shape of the server payload is documented in
 * `services/api/api.ts` (svarapro client) — we hit the same single
 * `POST /finances/transaction` endpoint with a `type` discriminator.
 *
 *   POST /finances/transaction (JWT)
 *     body { telegramId, currency, type: 'deposit' }
 *       → { address, trackerId }
 *     body { telegramId, currency, type: 'withdraw', amount, receiver }
 *       → { address, trackerId }
 *
 * The v143 deposit modal lets the user pick a "method" (`ton`, `usdt`,
 * `card`) — the server speaks currency codes (`TON`, `USDTTON`, …) so
 * we maintain a small lookup table here. Card payments don't have a
 * server flow yet; the v143 UI keeps a mock confirmation step for them
 * pending a dedicated card-acquirer integration.
 *
 * When `VITE_API_BASE_URL` is unset (local dev / preview) the helpers
 * fall back to deterministic mocks so the UI keeps working offline and
 * Stage 5 visual smoke tests still pass.
 */
import { DEPOSIT_METHODS, WITHDRAW_METHODS } from '../data/mocks';
import { getTelegramUserId } from '../services/telegram';
import type { DepositMethod, WithdrawMethod } from '../types/domain';
import { httpRequest } from './client';

export const fetchDepositMethods = async (): Promise<DepositMethod[]> => DEPOSIT_METHODS;
export const fetchWithdrawMethods = async (): Promise<WithdrawMethod[]> => WITHDRAW_METHODS;

/**
 * Map a v143 method id to the currency code the svarapro backend
 * expects on `POST /finances/transaction`. The `card` method has no
 * server flow yet — callers should branch on this returning `null`.
 */
export const methodIdToCurrency = (methodId: string | null | undefined): string | null => {
  switch (methodId) {
    case 'ton':
      return 'TON';
    case 'usdt':
      return 'USDTTON';
    default:
      return null;
  }
};

interface ServerTransactionResponse {
  address: string;
  trackerId?: string;
  tracker_id?: string;
}

export interface PaymentInstructions {
  address: string;
  trackerId: string;
  currency: string;
}

const apiConfigured = (): boolean => Boolean(import.meta.env?.VITE_API_BASE_URL);

const buildMockInstructions = (currency: string): PaymentInstructions => ({
  // Stable mock addresses so the QR / copy UI stays predictable in
  // local dev. Mirrors what `CryptoPaymentStep` used to bake in.
  address:
    currency === 'TON'
      ? 'UQBxxxxxxxxxxxxxxxxxxxxxxxxK9f'
      : 'TRXxxxxxxxxxxxxxxxxxxxxm4Kz',
  trackerId: `mock_${Date.now()}`,
  currency,
});

const normalizeTransactionResponse = (
  raw: ServerTransactionResponse | null,
  currency: string,
): PaymentInstructions => {
  if (!raw) throw new Error('Empty deposit response');
  const trackerId = raw.trackerId ?? raw.tracker_id;
  if (!raw.address || !trackerId) {
    throw new Error('Invalid deposit response');
  }
  return { address: raw.address, trackerId, currency };
};

export interface CreateDepositInput {
  methodId: string;
}

/**
 * Kick off a deposit on the server side. Returns the on-chain address
 * the user should send funds to, plus the tracker id used to monitor
 * the payment status (and shown in `CryptoPaymentStep`).
 */
export const initiateDeposit = async (
  { methodId }: CreateDepositInput,
): Promise<PaymentInstructions> => {
  const currency = methodIdToCurrency(methodId);
  if (!currency) {
    throw new Error(`Unsupported deposit method: ${methodId}`);
  }
  if (!apiConfigured()) return buildMockInstructions(currency);

  const telegramId = getTelegramUserId();
  if (telegramId == null) {
    throw new Error('Telegram user id is unavailable');
  }

  const response = await httpRequest<ServerTransactionResponse>(
    '/finances/transaction',
    {
      method: 'POST',
      body: { telegramId: String(telegramId), currency, type: 'deposit' },
    },
  );
  return normalizeTransactionResponse(response, currency);
};

export interface CreateWithdrawalInput {
  methodId: string;
  amount: number;
  address: string;
}

export interface WithdrawalReceipt {
  ok: true;
  methodId: string;
  currency: string;
  amount: number;
  address: string;
  trackerId: string;
}

/**
 * Create a withdrawal request. The server queues the payout and
 * returns the same `{ address, trackerId }` envelope as deposits so
 * callers can surface the tracker id to the user.
 */
export const initiateWithdraw = async (
  { methodId, amount, address }: CreateWithdrawalInput,
): Promise<WithdrawalReceipt> => {
  const currency = methodIdToCurrency(methodId);
  if (!currency) {
    throw new Error(`Unsupported withdraw method: ${methodId}`);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be positive');
  }
  if (!address.trim()) {
    throw new Error('Wallet address is required');
  }
  if (!apiConfigured()) {
    return {
      ok: true,
      methodId,
      currency,
      amount,
      address,
      trackerId: `mock_${Date.now()}`,
    };
  }

  const telegramId = getTelegramUserId();
  if (telegramId == null) {
    throw new Error('Telegram user id is unavailable');
  }

  const response = await httpRequest<ServerTransactionResponse>(
    '/finances/transaction',
    {
      method: 'POST',
      body: {
        telegramId: String(telegramId),
        currency,
        type: 'withdraw',
        amount,
        receiver: address,
      },
    },
  );
  const normalized = normalizeTransactionResponse(response, currency);
  return {
    ok: true,
    methodId,
    currency,
    amount,
    address,
    trackerId: normalized.trackerId,
  };
};

// ---------------------------------------------------------------------------
// Legacy aliases retained for ModalsManager / older v143 imports — both
// keep the same external contract so callers don't have to migrate in
// the same PR. New code should use the named `initiateDeposit` /
// `initiateWithdraw` helpers directly.
// ---------------------------------------------------------------------------

export interface DepositReceipt {
  ok: true;
  method: string;
  amount: number;
  txId: string;
}

export const createDeposit = async ({
  method,
  amount,
}: {
  method: string;
  amount: number;
}): Promise<DepositReceipt> => {
  const instructions = await initiateDeposit({ methodId: method });
  return {
    ok: true,
    method,
    amount,
    txId: instructions.trackerId,
  };
};

export const createWithdrawal = async ({
  method,
  amount,
  address,
}: {
  method: string;
  amount: number;
  address: string;
}): Promise<{
  ok: true;
  method: string;
  amount: number;
  address: string;
  txId: string;
}> => {
  const receipt = await initiateWithdraw({ methodId: method, amount, address });
  return {
    ok: true,
    method,
    amount,
    address,
    txId: receipt.trackerId,
  };
};

/** Internal helpers exported for unit tests. */
export const __testing__ = {
  methodIdToCurrency,
  normalizeTransactionResponse,
  buildMockInstructions,
};
