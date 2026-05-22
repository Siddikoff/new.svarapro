/**
 * Tiny fetch wrapper.
 *
 * Stage 2 wires up the REST endpoints exposed by the svarapro NestJS
 * backend. Endpoint modules (`api/rooms.ts`, `api/user.ts`, …) call
 * `httpRequest` / `httpRequestParsed` instead of returning mocks.
 *
 * Auth flow (see `api/auth.ts`):
 *   1. On boot the client posts the Telegram `initData` to `/auth/login`
 *      and gets back a JWT.
 *   2. `setAuthToken(jwt)` is called from `authStore`.
 *   3. Subsequent requests attach `Authorization: Bearer <jwt>`.
 *
 * Telegram `initData` is also forwarded on every request as
 * `X-Telegram-Init-Data` for endpoints that re-validate it server-side.
 *
 * `httpRequest`        — typed at compile time, no runtime check.
 * `httpRequestParsed`  — same, plus a Zod schema validates the response
 *                         before the caller sees it. Use this for every
 *                         endpoint whose schema lives in
 *                         `src/shared/protocol/api/schemas.ts`.
 */

import type { z } from 'zod';

import { validateApiResponse } from '../shared/protocol';

const BASE_URL: string = import.meta.env?.VITE_API_BASE_URL ?? '';

/**
 * The JWT lives in `localStorage` so it survives full page reloads and
 * Telegram's "back to chat → reopen" flow. Without persistence, every
 * reload would replay the `initData` → `/auth/login` round-trip, which
 * Telegram rate-limits and which fails silently in dev preview where
 * `initData` is empty. The runtime cache below is a hot path so we don't
 * touch `localStorage` on every request.
 */
const AUTH_TOKEN_STORAGE_KEY = 'svarapro:authToken';

const readStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage?.getItem(AUTH_TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

const writeStoredToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage?.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (Safari private mode, etc.) — fall back to
    // in-memory only.
  }
};

let authToken: string | null = readStoredToken();

/** Set / clear the JWT used by subsequent requests. */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
  writeStoredToken(token);
};

/** Current JWT (mainly for the socket layer to forward in `auth`). */
export const getAuthToken = (): string | null => authToken;

const buildUrl = (path: string): string => {
  if (/^https?:/i.test(path)) return path;
  if (!BASE_URL) return path;
  return `${BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

const getTelegramInitData = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initData ?? null;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export const httpRequest = async <T = unknown>(
  path: string,
  { method = 'GET', body, headers, signal }: HttpRequestOptions = {},
): Promise<T | null> => {
  const initData = getTelegramInitData();
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return (await response.json()) as T;
};

/**
 * Like {@link httpRequest} but validates the JSON body against `schema`
 * before returning. Throws on validation failure with the offending
 * issues attached so callers don't silently consume malformed data.
 *
 * Use this from endpoint modules:
 *   return httpRequestParsed(UserSchema, '/me');
 */
export const httpRequestParsed = async <T>(
  schema: z.ZodType<T>,
  path: string,
  options?: HttpRequestOptions,
): Promise<T | null> => {
  const raw = await httpRequest<unknown>(path, options);
  if (raw === null) return null;
  const result = validateApiResponse(schema, raw);
  if (!result.ok) {
    if (typeof console !== 'undefined') console.error('[api] schema mismatch', path, result.error.issues);
    throw new Error(`API ${path} returned invalid payload`);
  }
  return result.data;
};
