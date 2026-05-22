// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEAL_ORDER,
  DEAL_START_DELAY_MS,
  ROUND_END_MS,
  SEAT_ROTATE_MS,
  type SeatAnchorPos,
  SEATS_DEFAULT,
} from '../../constants';
import { type RotationSeat, useSeatRotation } from '../useSeatRotation';

/**
 * useSeatRotation — drives the "spectator picks a seat → chain rotation →
 * commitment to bottom" state machine for GameRoom.
 *
 * The interesting paths are:
 *   - rotation offset that makes the chosen seat appear at the bottom
 *   - mid-deal join (round in progress → wait for ROUND_END_MS, then sit)
 *   - alone-in-room short-circuit (no dealing, no animations)
 *   - waitForNextRound short-circuit (forces dealing=false)
 *   - room.id change resets chosenPos / joinedMidDeal
 *
 * Timers are faked so we can advance through the deal-start delay and the
 * end-of-round handoff deterministically.
 */

const DEFAULT_ROOM = { id: 'r1', max: 6, players: 4 };

describe('useSeatRotation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('baseSeats', () => {
    it('uses the default 6-seat layout when room.max >= 6', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 6 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      expect(result.current.seats).toHaveLength(SEATS_DEFAULT.length);
      const positions = result.current.seats.map((s: RotationSeat) => s.pos).sort();
      const expected = SEATS_DEFAULT.map((s) => s.pos).sort();
      expect(positions).toEqual(expected);
    });

    it('falls back to the 4-seat layout when room.max === 4', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 4, players: 4 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      expect(result.current.seats).toHaveLength(4);
      const positions = result.current.seats.map((s: RotationSeat) => s.pos).sort();
      expect(positions).toEqual(
        ['top', 'right-center', 'bottom', 'left-center'].sort(),
      );
    });

    it('falls back to the 2-seat layout when room.max === 2', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 2, players: 2 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      expect(result.current.seats).toHaveLength(2);
      const positions = result.current.seats.map((s: RotationSeat) => s.pos).sort();
      expect(positions).toEqual(['bottom', 'top']);
    });

    it('marks the last few seats as empty when room.players < seat count', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 2 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      const emptyCount = result.current.seats.filter((s: RotationSeat) => s.empty).length;
      // 6 seat layout, 2 "other" players + me at bottom -> 3 visible empty side seats.
      // (The me-seat at bottom is skipped by the empty-marker since it's flagged me.)
      expect(emptyCount).toBe(3);
    });
  });

  describe('aloneInRoom', () => {
    it('returns true when players <= 1 and not spectator', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 1 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      expect(result.current.aloneInRoom).toBe(true);
    });

    it('returns false when spectator is true (cannot be alone as observer)', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 1 },
          spectator: true,
          waitForNextRound: false,
        }),
      );
      expect(result.current.aloneInRoom).toBe(false);
    });

    it('marks every non-me seat as empty when alone', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 1 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      const emptyCount = result.current.seats.filter((s: RotationSeat) => s.empty).length;
      const meCount = result.current.seats.filter((s: RotationSeat) => s.me).length;
      expect(meCount).toBe(1);
      // 6 layout, me sits at bottom, the other 5 are empty
      expect(emptyCount).toBe(5);
    });
  });

  describe('dealing lifecycle', () => {
    it('starts dealing after DEAL_START_DELAY_MS when nothing blocks it', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: false,
          waitForNextRound: false,
        }),
      );
      expect(result.current.dealing).toBe(false);
      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS + 10);
      });
      expect(result.current.dealing).toBe(true);
      expect(result.current.showDealing).toBe(true);
    });

    it('never starts dealing when waitForNextRound is true', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: true,
        }),
      );
      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS * 2);
      });
      expect(result.current.dealing).toBe(false);
      expect(result.current.showDealing).toBe(false);
    });

    it('never starts dealing when aloneInRoom', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 1 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS * 2);
      });
      expect(result.current.dealing).toBe(false);
    });
  });

  describe('getDisplayPos', () => {
    it('is the identity when chosenPos is null', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
        }),
      );
      for (const pos of DEAL_ORDER) {
        expect(result.current.getDisplayPos(pos)).toBe(pos);
      }
    });
  });

  describe('handleTakeSeat — spectator, NOT dealing', () => {
    it('commits immediately when seat is bottom', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      act(() => {
        result.current.handleTakeSeat({ id: 99, pos: 'bottom' });
      });
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
    });

    it('rotates first, then commits after SEAT_ROTATE_MS+40 for a side seat', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      act(() => {
        result.current.handleTakeSeat({ id: 7, pos: 'left-up' });
      });
      // No commit yet — the chain rotation has not finished animating.
      expect(onTakeSeat).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(SEAT_ROTATE_MS + 40 + 5);
      });
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
      expect(onTakeSeat).toHaveBeenCalledWith({ id: 7, pos: 'left-up' });
    });

    it('rotates the table so the chosen seat appears at the bottom', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
        }),
      );
      act(() => {
        result.current.handleTakeSeat({ id: 7, pos: 'left-up' });
      });
      // After choosing 'left-up' the rotation offset moves it visually
      // to where 'bottom' lives.
      expect(result.current.getDisplayPos('left-up')).toBe('bottom');
    });
  });

  describe('handleTakeSeat — null', () => {
    it('forwards null straight through to onTakeSeat', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      act(() => {
        result.current.handleTakeSeat(null);
      });
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
      expect(onTakeSeat).toHaveBeenCalledWith(null);
    });
  });

  describe('handleTakeSeat — non-spectator', () => {
    it('forwards seat straight through (no rotation animation)', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: false,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      const seat: RotationSeat = { id: 3, pos: 'left-up' };
      act(() => {
        result.current.handleTakeSeat(seat);
      });
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
      expect(onTakeSeat).toHaveBeenCalledWith(seat);
    });
  });

  describe('mid-deal join', () => {
    it('sets joinedMidDeal and DEFERS commit until ROUND_END_MS', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      // Wait for the dealer to start dealing.
      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS + 10);
      });
      expect(result.current.dealing).toBe(true);

      // Try to take a side seat *while* dealing is in progress.
      act(() => {
        result.current.handleTakeSeat({ id: 4, pos: 'right-up' });
      });
      expect(result.current.joinedMidDeal).toBe(true);
      // No immediate onTakeSeat call — wait for the round to end.
      expect(onTakeSeat).not.toHaveBeenCalled();

      // After the round ends, the deferred handoff runs.
      act(() => {
        vi.advanceTimersByTime(ROUND_END_MS + 10);
      });
      // After joinedMidDeal flips back to false, the post-rotation
      // commit fires after another SEAT_ROTATE_MS+40 tick.
      act(() => {
        vi.advanceTimersByTime(SEAT_ROTATE_MS + 50);
      });
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
      expect(onTakeSeat).toHaveBeenCalledWith({ pos: 'right-up' });
      expect(result.current.joinedMidDeal).toBe(false);
    });

    it('takes the bottom seat immediately after the round ends (no extra delay)', () => {
      const onTakeSeat = vi.fn();
      const { result } = renderHook(() =>
        useSeatRotation({
          room: DEFAULT_ROOM,
          spectator: true,
          waitForNextRound: false,
          onTakeSeat,
        }),
      );
      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS + 10);
      });
      act(() => {
        result.current.handleTakeSeat({ id: 6, pos: 'bottom' });
      });
      expect(result.current.joinedMidDeal).toBe(true);
      expect(onTakeSeat).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(ROUND_END_MS + 10);
      });
      // For 'bottom' the commit fires inline — no rotation phase needed.
      expect(onTakeSeat).toHaveBeenCalledTimes(1);
      expect(onTakeSeat).toHaveBeenCalledWith({ pos: 'bottom' });
    });
  });

  describe('room.id change', () => {
    it('resets chosenPos and joinedMidDeal when the room changes', () => {
      const onTakeSeat = vi.fn();
      const { result, rerender } = renderHook(
        ({ roomId }: { roomId: string }) =>
          useSeatRotation({
            room: { id: roomId, max: 6, players: 4 },
            spectator: true,
            waitForNextRound: false,
            onTakeSeat,
          }),
        { initialProps: { roomId: 'r1' } },
      );

      act(() => {
        vi.advanceTimersByTime(DEAL_START_DELAY_MS + 10);
      });
      act(() => {
        result.current.handleTakeSeat({ id: 4, pos: 'right-up' });
      });
      expect(result.current.joinedMidDeal).toBe(true);

      rerender({ roomId: 'r2' });
      // After the room id changes the state machine is back to neutral.
      expect(result.current.joinedMidDeal).toBe(false);
    });
  });

  describe('activeDealOrder', () => {
    it('only contains positions that have a non-empty, non-me-joining seat', () => {
      const { result } = renderHook(() =>
        useSeatRotation({
          room: { id: 'r1', max: 6, players: 2 },
          spectator: false,
          waitForNextRound: false,
        }),
      );
      const allDealPositions = new Set<SeatAnchorPos>(DEAL_ORDER);
      result.current.activeDealOrder.forEach((pos: SeatAnchorPos) => {
        expect(allDealPositions.has(pos)).toBe(true);
      });
      // 2 "other" players + me at bottom -> 3 dealable seats in the order.
      expect(result.current.activeDealOrder).toHaveLength(3);
    });
  });
});
