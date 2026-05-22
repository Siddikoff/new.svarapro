/**
 * Auth API.
 *
 * Posts the Telegram `initData` (with HMAC signature) to the server's
 * `/auth/login` endpoint and gets back a JWT. The server validates the
 * signature against its `BOT_TOKEN`, upserts the `users` table, and
 * returns the signed token.
 *
 * Response shape mirrors `AuthService.login` in
 * `server/src/modules/auth/auth.service.ts`.
 */
import { httpRequest } from './client';

export interface LoginResponse {
  accessToken: string;
  /**
   * Set when the user opened the Mini App via a deep-link of the form
   * `ref{id}-room{id}` — the lobby should auto-join that room.
   */
  roomId?: string;
}

/**
 * `initData` is the raw `window.Telegram.WebApp.initData` string. Pass it
 * verbatim — the server URL-decodes and verifies the HMAC.
 *
 * `startPayload` is `window.Telegram.WebApp.initDataUnsafe.start_param`,
 * forwarded so the backend can resolve referral / deep-link state.
 */
export const loginWithInitData = async (
  initData: string,
  startPayload?: string,
): Promise<LoginResponse> => {
  const result = await httpRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { initData, ...(startPayload ? { startPayload } : {}) },
  });
  if (!result) {
    throw new Error('Login response was empty');
  }
  return result;
};
