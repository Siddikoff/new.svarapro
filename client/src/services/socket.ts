/**
 * Socket.IO client.
 *
 * The svarapro backend exposes its real-time API via socket.io (see
 * `server/src/modules/rooms/rooms.gateway.ts` and `game.gateway.ts`).
 * This module is the single entry point the client uses to talk to it.
 *
 * Behaviour:
 *   - `connect(options)`       — establish (or re-establish) the socket.
 *                                `options.token` is the JWT issued by
 *                                `/auth/login`. `options.telegramId` /
 *                                `options.userData` are forwarded in
 *                                the socket.io `auth` payload because
 *                                the legacy GameGateway reads them
 *                                from `client.handshake.auth.telegramId`
 *                                / `userData`.
 *   - `disconnect()`           — tear down the socket.
 *   - `on(event, handler)`     — subscribe; returns an unsubscriber.
 *   - `emit(event, payload)`   — fire-and-forget send; buffers silently
 *                                if the socket isn't connected yet.
 *
 * Reconnection is handled by socket.io itself (default exponential
 * backoff). Connection lifecycle is mirrored into `connectionStore`
 * so React components can show a status badge.
 *
 * When `VITE_SOCKET_URL` is unset, the socket falls back to
 * `window.location.origin` so the bundle served by nginx (which already
 * proxies `socket.io/`) just works without env wiring. In SSR / Node
 * test contexts where `window` is absent, `connect` is a no-op.
 */

import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { CONNECTION_STATUS, useConnectionStore } from '../store/connectionStore';

export interface SocketUserData {
  username: string;
  avatar: string;
}

export interface ConnectSocketOptions {
  token?: string | null;
  /** Telegram user id (string). Required by the GameGateway handshake. */
  telegramId?: string | null;
  /** Cosmetic profile for `sit_down` — forwarded in the handshake. */
  userData?: SocketUserData | null;
}

type SocketHandler<P = unknown> = (payload: P) => void;
type SocketUnsubscribe = () => void;

const ENV_SOCKET_URL: string = import.meta.env?.VITE_SOCKET_URL ?? '';

const resolveSocketUrl = (): string | null => {
  if (ENV_SOCKET_URL) return ENV_SOCKET_URL;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return null;
};

let socket: Socket | null = null;
/** Listeners registered before the socket exists are replayed on connect. */
const pendingListeners = new Map<string, Set<SocketHandler>>();
/**
 * Callbacks that need to run on every `connect` event (including the
 * automatic reconnects socket.io performs internally after a transport
 * drop). Subscribing here is the canonical way to re-emit per-socket
 * subscriptions (`subscribe_balance`, `join_room`, ...) — without
 * re-running them the new server-side socket is not in any of the
 * rooms the previous one was, and broadcasts silently stop arriving.
 */
const connectListeners = new Set<() => void>();

const setStatus = (status: (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS]): void => {
  useConnectionStore.getState().setStatus(status);
};

const replayPendingListeners = (s: Socket): void => {
  pendingListeners.forEach((handlers, event) => {
    handlers.forEach((handler) => s.on(event, handler));
  });
};

/**
 * Backwards-compatible overload: `connectSocket(token)` keeps working for
 * the Stage-2 lobby bootstrap that didn't pass `telegramId` yet.
 */
export function connectSocket(token: string | null): void;
export function connectSocket(options: ConnectSocketOptions): void;
export function connectSocket(
  arg: string | null | ConnectSocketOptions,
): void {
  const url = resolveSocketUrl();
  if (!url) return;
  if (socket?.connected) return;

  const options: ConnectSocketOptions =
    arg === null || typeof arg === 'string' ? { token: arg } : arg;

  const auth: Record<string, unknown> = {};
  if (options.token) auth.token = options.token;
  if (options.telegramId) auth.telegramId = options.telegramId;
  if (options.userData) auth.userData = options.userData;

  setStatus(CONNECTION_STATUS.connecting);
  socket = io(url, {
    transports: ['websocket'],
    auth: Object.keys(auth).length > 0 ? auth : undefined,
    reconnection: true,
  });

  socket.on('connect', () => {
    setStatus(CONNECTION_STATUS.open);
    connectListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Swallow — one buggy listener should not block the others.
      }
    });
  });
  socket.on('disconnect', () => setStatus(CONNECTION_STATUS.closed));
  socket.on('connect_error', () => setStatus(CONNECTION_STATUS.closed));

  replayPendingListeners(socket);
}

export const disconnectSocket = (): void => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  setStatus(CONNECTION_STATUS.closed);
};

export const onSocketEvent = <P = unknown>(
  event: string,
  handler: SocketHandler<P>,
): SocketUnsubscribe => {
  const typedHandler = handler as SocketHandler;

  if (socket) {
    socket.on(event, typedHandler);
  }

  // Always track pending so reconnects re-attach the listener.
  const bucket = pendingListeners.get(event) ?? new Set<SocketHandler>();
  bucket.add(typedHandler);
  pendingListeners.set(event, bucket);

  return () => {
    socket?.off(event, typedHandler);
    bucket.delete(typedHandler);
    if (bucket.size === 0) pendingListeners.delete(event);
  };
};

export const emitSocketEvent = <P = unknown>(event: string, payload?: P): void => {
  socket?.emit(event, payload);
};

/**
 * Register a callback that runs every time the socket transitions into
 * the `connect` state (initial connect and every subsequent reconnect).
 *
 * If the socket is already connected at registration time the callback
 * fires immediately, so the caller does not need to special-case the
 * "subscribed before / after open" race. The returned unsubscriber
 * removes the callback from the rotation; outstanding fires still run.
 */
export const onSocketConnect = (cb: () => void): SocketUnsubscribe => {
  connectListeners.add(cb);
  if (socket?.connected) {
    try {
      cb();
    } catch {
      // Same swallow rationale as the on('connect') handler.
    }
  }
  return () => {
    connectListeners.delete(cb);
  };
};

export const isSocketConnected = (): boolean => Boolean(socket?.connected);

/** Internal helpers exposed for tests only. */
export const __testing__ = {
  resetSocket: (): void => {
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    pendingListeners.clear();
    connectListeners.clear();
  },
};
