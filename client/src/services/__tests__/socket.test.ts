// @vitest-environment jsdom
/**
 * socket.ts — unit tests for the lifecycle behaviours added in the
 * UX-parity audit follow-up:
 *
 *   - `connectSocket` is idempotent (StrictMode double-mount safety).
 *   - `visibilitychange` triggers a manual reconnect when the tab
 *     comes back to foreground and the socket is dead.
 *   - `disconnectSocket` cleans up the visibility listener.
 *
 * Mocks `socket.io-client` so no real network is involved. Runs in
 * jsdom (vs the default node env in vitest.config.ts) because the
 * production code listens on `document.visibilitychange`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture every `io()` call so the test can drive the fake socket.
let createdSockets = 0;
const lastSocket: {
  current: {
    connected: boolean;
    listeners: Map<string, ((...args: unknown[]) => void)[]>;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    off: (event: string, cb: (...args: unknown[]) => void) => void;
    emit: (...args: unknown[]) => void;
    connect: () => void;
    disconnect: () => void;
    removeAllListeners: () => void;
  } | null;
} = { current: null };

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    createdSockets += 1;
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
    const sock = {
      connected: false,
      listeners,
      on: (event: string, cb: (...args: unknown[]) => void) => {
        const bucket = listeners.get(event) ?? [];
        bucket.push(cb);
        listeners.set(event, bucket);
      },
      off: (event: string, cb: (...args: unknown[]) => void) => {
        const bucket = listeners.get(event) ?? [];
        listeners.set(
          event,
          bucket.filter((h) => h !== cb),
        );
      },
      emit: () => {},
      connect: vi.fn(),
      disconnect: () => {
        sock.connected = false;
      },
      removeAllListeners: () => {
        listeners.clear();
      },
    };
    lastSocket.current = sock;
    return sock;
  }),
}));

import {
  __testing__,
  connectSocket,
  disconnectSocket,
  isSocketConnected,
} from '../socket';

const setVisibility = (state: 'visible' | 'hidden'): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
};

describe('socket lifecycle', () => {
  beforeEach(() => {
    createdSockets = 0;
    lastSocket.current = null;
    __testing__.resetSocket();
    setVisibility('visible');
  });

  afterEach(() => {
    __testing__.resetSocket();
  });

  it('connectSocket is idempotent — second call is a no-op', () => {
    connectSocket({ telegramId: '111' });
    connectSocket({ telegramId: '111' });
    // socket.io-client `io()` must only be invoked once even though
    // React StrictMode (or any other accidental re-entry) calls
    // `connectSocket` twice in a row.
    expect(createdSockets).toBe(1);
  });

  it('attaches a visibilitychange handler on first connect', () => {
    expect(__testing__.hasVisibilityHandler()).toBe(false);
    connectSocket({ telegramId: '111' });
    expect(__testing__.hasVisibilityHandler()).toBe(true);
  });

  it('disconnectSocket removes the visibility handler', () => {
    connectSocket({ telegramId: '111' });
    expect(__testing__.hasVisibilityHandler()).toBe(true);
    disconnectSocket();
    expect(__testing__.hasVisibilityHandler()).toBe(false);
  });

  it('visibilitychange while hidden does not poke the socket', () => {
    connectSocket({ telegramId: '111' });
    const sock = lastSocket.current!;
    sock.connected = false;
    setVisibility('hidden');
    __testing__.triggerVisibilityChange();
    expect(sock.connect).not.toHaveBeenCalled();
  });

  it('visibilitychange to visible reconnects a dead socket', () => {
    connectSocket({ telegramId: '111' });
    const sock = lastSocket.current!;
    sock.connected = false;
    setVisibility('visible');
    __testing__.triggerVisibilityChange();
    expect(sock.connect).toHaveBeenCalledTimes(1);
  });

  it('visibilitychange to visible leaves a healthy socket alone', () => {
    connectSocket({ telegramId: '111' });
    const sock = lastSocket.current!;
    sock.connected = true;
    setVisibility('visible');
    __testing__.triggerVisibilityChange();
    expect(sock.connect).not.toHaveBeenCalled();
  });

  it('isSocketConnected reflects the underlying socket state', () => {
    expect(isSocketConnected()).toBe(false);
    connectSocket({ telegramId: '111' });
    expect(isSocketConnected()).toBe(false); // not yet connected
    lastSocket.current!.connected = true;
    expect(isSocketConnected()).toBe(true);
  });
});
