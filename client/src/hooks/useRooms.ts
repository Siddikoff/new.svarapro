import { useMemo } from 'react';

import { BET_LADDER } from '../constants/bets';
import { type RoomFilters, type SeatCountFilter,useRoomStore } from '../store/roomStore';
import type { Room } from '../types/domain';

export type { Room, RoomFilters };

export interface UseRoomsResult {
  rooms: Room[];
  filteredRooms: Room[];
  filters: RoomFilters;
  activeFilterCount: number;
}

const matchesSearch = (room: Room, search: string): boolean =>
  search === '' || String(room.num).includes(search);

const isAvailable = (room: Room): boolean => room.players < room.max;

const inBetRange = (room: Room, minIndex: number, maxIndex: number): boolean =>
  room.bet >= BET_LADDER[minIndex] && room.bet <= BET_LADDER[maxIndex];

const matchesSeatCount = (room: Room, seatCount: SeatCountFilter): boolean =>
  seatCount === 'all' || room.max === Number(seatCount);

/**
 * useRooms — read-only selector that returns rooms + filtered list + helpers.
 *
 * Components don't have to know about the store shape; they can call
 * `useRooms()` and get a ready-to-render list plus the active filters.
 */
export const useRooms = (): UseRoomsResult => {
  const rooms = useRoomStore((state) => state.rooms);
  const filters = useRoomStore((state) => state.filters);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (!matchesSearch(room, filters.search)) return false;
      if (filters.onlyAvailable && !isAvailable(room)) return false;
      if (!inBetRange(room, filters.betMinIndex, filters.betMaxIndex)) return false;
      if (!matchesSeatCount(room, filters.seatCount)) return false;
      return true;
    });
  }, [rooms, filters]);

  // `onlyAvailable` is exposed as a separate toggle in the lobby header, so
  // it should not count toward the "filter sheet" badge — otherwise the
  // funnel icon lights up whenever the user flips that toggle, even though
  // nothing inside the filter sheet is set.
  const activeFilterCount = useMemo(() => {
    const betChanged = filters.betMinIndex !== 0 || filters.betMaxIndex !== BET_LADDER.length - 1;
    const seatChanged = filters.seatCount !== 'all';
    return (betChanged ? 1 : 0) + (seatChanged ? 1 : 0);
  }, [filters.betMinIndex, filters.betMaxIndex, filters.seatCount]);

  return { rooms, filteredRooms, filters, activeFilterCount };
};
