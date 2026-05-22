import { beforeEach, describe, expect, it } from 'vitest';

import { GAME_PHASES, useGameStore } from '../gameStore';

/**
 * gameStore.realtimeSlice — reconciliation rules from v32.
 *
 * The goal of these tests is to pin down version / out-of-order
 * semantics so any future change to the reducer (e.g. switching to
 * immer) keeps the same observable behaviour:
 *
 *   - snapshot.version < state.version       → drop (bump desyncCount)
 *   - tick.version !== state.version          → drop (bump desyncCount)
 *   - tick.t <= state.lastTickT (same ver)    → drop (bump desyncCount)
 *
 * A fresh snapshot resets `lastTickT` to 0 so a tick with `t = 1`
 * applied immediately after is *not* considered stale.
 */
describe('gameStore — realtime slice', () => {
  beforeEach(() => {
    useGameStore.getState().resetRealtime();
  });

  describe('applySnapshot', () => {
    it('applies an initial snapshot', () => {
      useGameStore.getState().applySnapshot({
        version: 1,
        seats: {},
        pot: 50,
        phase: GAME_PHASES.betting,
      });
      const s = useGameStore.getState();
      expect(s.version).toBe(1);
      expect(s.pot).toBe(50);
      expect(s.phase).toBe(GAME_PHASES.betting);
      expect(s.desyncCount).toBe(0);
    });

    it('drops a stale snapshot (version below current)', () => {
      const { applySnapshot } = useGameStore.getState();
      applySnapshot({ version: 5, seats: {}, pot: 100, phase: GAME_PHASES.dealing });
      applySnapshot({ version: 2, seats: {}, pot: 999, phase: GAME_PHASES.idle });
      const s = useGameStore.getState();
      expect(s.version).toBe(5);
      expect(s.pot).toBe(100);
      expect(s.desyncCount).toBe(1);
    });

    it('accepts equal-version snapshot (resync from the same version)', () => {
      const { applySnapshot } = useGameStore.getState();
      applySnapshot({ version: 3, seats: {}, pot: 100, phase: GAME_PHASES.dealing });
      applySnapshot({ version: 3, seats: {}, pot: 200, phase: GAME_PHASES.betting });
      const s = useGameStore.getState();
      expect(s.version).toBe(3);
      expect(s.pot).toBe(200);
      expect(s.desyncCount).toBe(0);
    });

    it('resets lastTickT so a t=1 tick is not dropped right after', () => {
      const { applySnapshot, applyTick } = useGameStore.getState();
      applySnapshot({ version: 1, seats: {}, pot: 0, phase: GAME_PHASES.dealing });
      applyTick({ t: 1, version: 1, pot: 5 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(5);
      expect(s.lastTickT).toBe(1);
    });
  });

  describe('applyTick', () => {
    beforeEach(() => {
      useGameStore.getState().applySnapshot({
        version: 2,
        seats: {},
        pot: 0,
        phase: GAME_PHASES.dealing,
      });
    });

    it('applies an in-order tick on the current version', () => {
      useGameStore.getState().applyTick({ t: 100, version: 2, pot: 10 });
      useGameStore.getState().applyTick({ t: 200, version: 2, pot: 20 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(20);
      expect(s.lastTickT).toBe(200);
      expect(s.desyncCount).toBe(0);
    });

    it('drops a tick with a wrong version (mismatch)', () => {
      useGameStore.getState().applyTick({ t: 100, version: 7, pot: 999 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(0);
      expect(s.version).toBe(2);
      expect(s.desyncCount).toBe(1);
    });

    it('drops an out-of-order tick (older t in same version)', () => {
      useGameStore.getState().applyTick({ t: 200, version: 2, pot: 20 });
      useGameStore.getState().applyTick({ t: 100, version: 2, pot: 999 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(20);
      expect(s.lastTickT).toBe(200);
      expect(s.desyncCount).toBe(1);
    });

    it('drops a duplicate tick (same t)', () => {
      useGameStore.getState().applyTick({ t: 100, version: 2, pot: 10 });
      useGameStore.getState().applyTick({ t: 100, version: 2, pot: 999 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(10);
      expect(s.desyncCount).toBe(1);
    });

    it('treats missing tick.version as matching the current version', () => {
      useGameStore.getState().applyTick({ t: 100, pot: 42 });
      const s = useGameStore.getState();
      expect(s.pot).toBe(42);
      expect(s.lastTickT).toBe(100);
    });
  });

  describe('applyPlayerJoined / applyPlayerLeft', () => {
    it('inserts and removes seats', () => {
      const seat = {
        seatId: 1,
        name: 'A',
        photo: 0,
        stack: 100,
        bet: 0,
        folded: false,
      };
      useGameStore.getState().applyPlayerJoined({ seatId: 1, seat });
      expect(Object.keys(useGameStore.getState().seats)).toEqual(['1']);

      useGameStore.getState().applyPlayerLeft({ seatId: 1 });
      expect(Object.keys(useGameStore.getState().seats)).toEqual([]);
    });
  });

  describe('applyRoundResult', () => {
    it('sets phase to round_end and stores the winner', () => {
      useGameStore.getState().applyRoundResult({ winnerId: 2, balanceDelta: 30 });
      const s = useGameStore.getState();
      expect(s.phase).toBe(GAME_PHASES.roundEnd);
      expect(s.winnerId).toBe(2);
    });
  });
});
