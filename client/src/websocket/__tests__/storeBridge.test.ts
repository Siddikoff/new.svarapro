// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SERVER_EVENTS } from '../../shared/protocol';
import { useConnectionStore } from '../../store/connectionStore';
import { GAME_PHASES, useGameStore } from '../../store/gameStore';
import { useToastStore } from '../../store/toastStore';
import { wsClient } from '../client';
import { attachStoreBridge } from '../storeBridge';

/**
 * These tests exercise the bridge directly by invoking the inbound
 * `wsClient.on(...)` listeners (no real socket). The bridge attaches
 * to existing stores at module load \u2014 we re-attach with the helper
 * and rely on the singleton client's listener registry.
 */
describe('storeBridge', () => {
  let detach: () => void;

  beforeEach(() => {
    useGameStore.getState().resetRealtime();
    useToastStore.getState().clearToasts();
    useConnectionStore.getState().reset();
    detach = attachStoreBridge();
  });

  afterEach(() => {
    detach?.();
    vi.restoreAllMocks();
  });

  /**
   * Invoke whatever listeners are registered for `type` on the wsClient
   * by reaching into the private map. Test-only \u2014 production code uses
   * `wsClient.dispatch` indirectly via the message handler.
   */
  const fire = (type: string, payload: unknown) => {
    type ClientInternals = {
      listeners: Map<string, Set<(p: unknown) => void>>;
    };
    const internals = wsClient as unknown as ClientInternals;
    const set = internals.listeners.get(type);
    if (!set) return;
    for (const handler of set) handler(payload);
  };

  it('routes ROOM_STATE to applySnapshot', () => {
    fire(SERVER_EVENTS.ROOM_STATE, {
      version: 1,
      seats: {},
      pot: 42,
      phase: GAME_PHASES.dealing,
    });
    expect(useGameStore.getState().pot).toBe(42);
    expect(useGameStore.getState().version).toBe(1);
  });

  it('routes GAME_TICK to applyTick when version matches', () => {
    fire(SERVER_EVENTS.ROOM_STATE, {
      version: 1,
      seats: {},
      pot: 0,
      phase: GAME_PHASES.dealing,
    });
    fire(SERVER_EVENTS.GAME_TICK, { t: 50, version: 1, pot: 7 });
    expect(useGameStore.getState().pot).toBe(7);
  });

  it('drops a GAME_TICK with version mismatch (bridge sends REQUEST_SNAPSHOT)', () => {
    fire(SERVER_EVENTS.ROOM_STATE, {
      version: 1,
      seats: {},
      pot: 0,
      phase: GAME_PHASES.dealing,
    });
    // Enter a room so the bridge has a roomId for the resync.
    useGameStore.getState().enterRoom({ id: 99, num: 1, players: 0, max: 6, bet: 10 });
    const sendSpy = vi.spyOn(wsClient, 'send');
    fire(SERVER_EVENTS.GAME_TICK, { t: 50, version: 9, pot: 999 });
    expect(useGameStore.getState().pot).toBe(0);
    expect(useGameStore.getState().desyncCount).toBe(1);
    expect(sendSpy).toHaveBeenCalledWith(
      'room:request_snapshot',
      expect.objectContaining({ roomId: 99 }),
    );
  });

  it('surfaces ERROR frames as toasts', () => {
    fire(SERVER_EVENTS.ERROR, { code: 'BAD_BET', message: 'Slishkom malo deneg' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.tone).toBe('error');
    expect(toasts[0]?.message).toBe('Slishkom malo deneg');
  });

  it('PONG handler records RTT in connectionStore', () => {
    fire(SERVER_EVENTS.PONG, { t: Date.now() - 30 });
    const { lastRttMs } = useConnectionStore.getState();
    expect(lastRttMs).not.toBeNull();
    expect(lastRttMs!).toBeGreaterThanOrEqual(0);
  });
});
