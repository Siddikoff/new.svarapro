// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BET_LADDER } from '../../constants/bets';
import { useRoomStore } from '../../store/roomStore';
import type { Room } from '../../types/domain';
import { useRooms } from '../useRooms';

/**
 * useRooms — pure read-only selector that wraps roomStore.
 *
 * These tests pin down the filter semantics that drive the lobby list:
 *   - search by room number (substring match against `room.num`)
 *   - onlyAvailable (hides rooms with players === max)
 *   - bet range [betMinIndex, betMaxIndex] using BET_LADDER
 *   - seatCount ('all' or fixed 2..6 — compared to room.max)
 *
 * activeFilterCount counts how many of {bet, seat} have been touched
 * relative to the defaults — used by the filter chip badge. `onlyAvailable`
 * is intentionally excluded since it lives in the lobby header (not the
 * filter sheet); otherwise the funnel icon would light up whenever the
 * user flipped a toggle that has nothing to do with the sheet.
 *
 * The store is reset between tests so each spec starts from a known shape.
 */

const ROOMS: Room[] = [
  { id: 1, num: 100, players: 2, max: 6, bet: 0.5 },        // available, low bet
  { id: 2, num: 200, players: 6, max: 6, bet: 5 },          // full, mid bet
  { id: 3, num: 1234, players: 3, max: 4, bet: 50 },        // 4-seat, mid-high bet
  { id: 4, num: 3399, players: 1, max: 2, bet: 500 },       // 2-seat, top bet
  { id: 5, num: 12, players: 5, max: 6, bet: 10 },          // available, mid bet
];

const initialFilters = useRoomStore.getState().filters;
const initialRooms = useRoomStore.getState().rooms;

describe('useRooms — filtering & active filter count', () => {
  beforeEach(() => {
    useRoomStore.setState({ rooms: ROOMS, filters: initialFilters });
  });

  afterEach(() => {
    useRoomStore.setState({ rooms: initialRooms, filters: initialFilters });
  });

  describe('defaults', () => {
    it('returns all rooms unfiltered with no active filters', () => {
      const { result } = renderHook(() => useRooms());
      expect(result.current.rooms).toHaveLength(ROOMS.length);
      expect(result.current.filteredRooms).toHaveLength(ROOMS.length);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('search filter', () => {
    it('matches a room by substring of num', () => {
      useRoomStore.getState().setFilter('search', '12');
      const { result } = renderHook(() => useRooms());
      // num 1234 and 12 both contain "12"
      const ids = result.current.filteredRooms.map((r: Room) => r.id).sort();
      expect(ids).toEqual([3, 5]);
    });

    it('returns no rooms when search has no match', () => {
      useRoomStore.getState().setFilter('search', '99999');
      const { result } = renderHook(() => useRooms());
      expect(result.current.filteredRooms).toHaveLength(0);
    });

    it('empty search keeps all rooms', () => {
      useRoomStore.getState().setFilter('search', '');
      const { result } = renderHook(() => useRooms());
      expect(result.current.filteredRooms).toHaveLength(ROOMS.length);
    });

    it('search does NOT count toward activeFilterCount', () => {
      // search is intentionally excluded — it's a separate input above
      // the filter sheet, not a chip toggle.
      useRoomStore.getState().setFilter('search', '100');
      const { result } = renderHook(() => useRooms());
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('onlyAvailable filter', () => {
    it('hides rooms where players === max', () => {
      useRoomStore.getState().setFilter('onlyAvailable', true);
      const { result } = renderHook(() => useRooms());
      const ids = result.current.filteredRooms.map((r: Room) => r.id).sort();
      // full rooms are id=2 (6/6); the rest have at least one seat
      expect(ids).toEqual([1, 3, 4, 5]);
    });

    it('does NOT count toward activeFilterCount when toggled on', () => {
      // The toggle lives in the lobby header, not in the filter sheet —
      // flipping it must not light up the funnel-icon badge.
      useRoomStore.getState().setFilter('onlyAvailable', true);
      const { result } = renderHook(() => useRooms());
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('bet range filter', () => {
    it('limits results to bets inside [BET_LADDER[min], BET_LADDER[max]]', () => {
      const lo = BET_LADDER.indexOf(1);     // -> 1
      const hi = BET_LADDER.indexOf(10);    // -> 3
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeGreaterThanOrEqual(0);
      useRoomStore.getState().setFilter('betMinIndex', lo);
      useRoomStore.getState().setFilter('betMaxIndex', hi);
      const { result } = renderHook(() => useRooms());
      const ids = result.current.filteredRooms.map((r: Room) => r.id).sort();
      // bets 1, 5, 10 -> ids 2, 5; 0.5/50/500 are out of range
      expect(ids).toEqual([2, 5]);
    });

    it('counts narrowing the bet range as 1 active filter', () => {
      useRoomStore.getState().setFilter('betMinIndex', 1);
      const { result } = renderHook(() => useRooms());
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('does NOT count the full-range default (0..ladder.length-1) as active', () => {
      useRoomStore.getState().setFilter('betMinIndex', 0);
      useRoomStore.getState().setFilter('betMaxIndex', BET_LADDER.length - 1);
      const { result } = renderHook(() => useRooms());
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('seatCount filter', () => {
    it('keeps only rooms with the matching max seats', () => {
      useRoomStore.getState().setFilter('seatCount', 4);
      const { result } = renderHook(() => useRooms());
      const ids = result.current.filteredRooms.map((r: Room) => r.id);
      expect(ids).toEqual([3]);
    });

    it('seatCount === "all" keeps every room', () => {
      useRoomStore.getState().setFilter('seatCount', 'all');
      const { result } = renderHook(() => useRooms());
      expect(result.current.filteredRooms).toHaveLength(ROOMS.length);
    });

    it('counts a specific seatCount as 1 active filter', () => {
      useRoomStore.getState().setFilter('seatCount', 2);
      const { result } = renderHook(() => useRooms());
      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe('combined filters', () => {
    it('AND-combines onlyAvailable + seatCount + bet range', () => {
      useRoomStore.getState().setFilter('onlyAvailable', true);
      useRoomStore.getState().setFilter('seatCount', 6);
      useRoomStore.getState().setFilter('betMinIndex', BET_LADDER.indexOf(0.5));
      useRoomStore.getState().setFilter('betMaxIndex', BET_LADDER.indexOf(10));
      const { result } = renderHook(() => useRooms());
      // Available 6-seat rooms with bet ≤ 10 -> ids 1 (bet 0.5), 5 (bet 10)
      const ids = result.current.filteredRooms.map((r: Room) => r.id).sort();
      expect(ids).toEqual([1, 5]);
      // bet range narrowed + seat -> 2 (onlyAvailable excluded by design)
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('updates filteredRooms reactively when the store rooms list changes', () => {
      const { result } = renderHook(() => useRooms());
      expect(result.current.filteredRooms).toHaveLength(ROOMS.length);
      act(() => {
        useRoomStore.getState().addRoom({
          id: 999,
          num: 7777,
          players: 0,
          max: 3,
          bet: 1,
        });
      });
      const ids = result.current.filteredRooms.map((r: Room) => r.id);
      expect(ids).toContain(999);
    });

    it('resetFilters brings activeFilterCount back to 0', () => {
      useRoomStore.getState().setFilter('onlyAvailable', true);
      useRoomStore.getState().setFilter('seatCount', 4);
      const { result, rerender } = renderHook(() => useRooms());
      // onlyAvailable is excluded by design → only seatCount counts.
      expect(result.current.activeFilterCount).toBe(1);
      act(() => useRoomStore.getState().resetFilters());
      rerender();
      expect(result.current.activeFilterCount).toBe(0);
    });
  });
});
