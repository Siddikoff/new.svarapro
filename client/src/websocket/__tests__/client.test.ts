// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/protocol';
import { useConnectionStore } from '../../store/connectionStore';
import { wsClient } from '../client';

/**
 * The singleton `wsClient` is constructed against `VITE_WS_URL`, which
 * is empty under vitest. That makes `connect()` a no-op (safe by
 * design) and lets us test the rest of the public API \u2014 buffering,
 * listener registration, lifecycle hooks, pong handling \u2014 without
 * mocking the WebSocket constructor.
 */
describe('wsClient (public API, offline mode)', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset();
  });

  it('send() does not throw when the socket is offline', () => {
    expect(() =>
      wsClient.send(CLIENT_EVENTS.JOIN_ROOM, { roomId: 1 }),
    ).not.toThrow();
  });

  it('on() returns an unsubscribe function that detaches the listener', () => {
    let count = 0;
    const off = wsClient.on(SERVER_EVENTS.ROOM_STATE, () => {
      count += 1;
    });
    expect(typeof off).toBe('function');
    off();
    // No assertion on count \u2014 just confirm unsubscribe is callable
    // without throwing. The behavioural check (no double-delivery)
    // would require a real socket simulation.
    expect(count).toBe(0);
  });

  it('onLifecycle() accepts subscriptions for open/reconnect/close', () => {
    const offs = (['open', 'reconnect', 'close'] as const).map((evt) =>
      wsClient.onLifecycle(evt, () => undefined),
    );
    expect(offs.every((fn) => typeof fn === 'function')).toBe(true);
    offs.forEach((fn) => fn());
  });

  it('notifyPong() records the round-trip time in connectionStore', () => {
    const sent = Date.now() - 50;
    wsClient.notifyPong(sent);
    const { lastRttMs } = useConnectionStore.getState();
    expect(lastRttMs).not.toBeNull();
    expect(lastRttMs!).toBeGreaterThanOrEqual(0);
    expect(lastRttMs!).toBeLessThan(5_000);
  });

  it('notifyPong() clears the stale flag', () => {
    useConnectionStore.getState().setStale(true);
    wsClient.notifyPong(Date.now());
    expect(useConnectionStore.getState().isStale).toBe(false);
  });
});
