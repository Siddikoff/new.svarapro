import { beforeEach, describe, expect, it } from 'vitest';

import { CONNECTION_STATUS, useConnectionStore } from '../connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset();
  });

  it('starts in `idle` with zero counters', () => {
    const s = useConnectionStore.getState();
    expect(s.status).toBe(CONNECTION_STATUS.idle);
    expect(s.reconnectAttempts).toBe(0);
    expect(s.lastRttMs).toBeNull();
    expect(s.lastFrameAt).toBeNull();
    expect(s.malformedFrames).toBe(0);
    expect(s.isStale).toBe(false);
  });

  it('records pong RTT and clears the stale flag', () => {
    useConnectionStore.getState().setStale(true);
    useConnectionStore.getState().recordPong(120);
    const s = useConnectionStore.getState();
    expect(s.lastRttMs).toBe(120);
    expect(s.isStale).toBe(false);
  });

  it('records frame arrival timestamps', () => {
    const before = Date.now();
    useConnectionStore.getState().recordFrame();
    const after = Date.now();
    const t = useConnectionStore.getState().lastFrameAt ?? 0;
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it('increments malformed-frame counter monotonically', () => {
    const { recordMalformed } = useConnectionStore.getState();
    recordMalformed();
    recordMalformed();
    recordMalformed();
    expect(useConnectionStore.getState().malformedFrames).toBe(3);
  });

  it('walks through the status lifecycle', () => {
    const { setStatus } = useConnectionStore.getState();
    const order = [
      CONNECTION_STATUS.connecting,
      CONNECTION_STATUS.open,
      CONNECTION_STATUS.closing,
      CONNECTION_STATUS.closed,
    ] as const;
    for (const s of order) {
      setStatus(s);
      expect(useConnectionStore.getState().status).toBe(s);
    }
  });
});
