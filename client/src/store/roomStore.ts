import { create } from 'zustand';

import { __testing__ as roomsTesting, fetchRooms } from '../api/rooms';
import { BET_LADDER } from '../constants/bets';
import { onSocketEvent } from '../services/socket';
import type { Room } from '../types/domain';

const { mapServerRoomToClient } = roomsTesting;

interface RoomsSocketFrame {
  action?: 'initial' | 'update';
  rooms?: Array<Parameters<typeof mapServerRoomToClient>[0]>;
}

export type RoomMode = 'join' | 'watch';
export type SeatCountFilter = 'all' | 2 | 3 | 4 | 5 | 6;

export interface RoomFilters {
  search: string;
  onlyAvailable: boolean;
  betMinIndex: number;
  betMaxIndex: number;
  seatCount: SeatCountFilter;
}

const initialFilters: RoomFilters = {
  search: '',
  onlyAvailable: false,
  betMinIndex: 0,
  betMaxIndex: BET_LADDER.length - 1,
  seatCount: 'all',
};

export interface RoomStoreState {
  rooms: Room[];
  isLoadingRooms: boolean;
  error: unknown;
  filters: RoomFilters;
  selectedRoom: Room | null;
  selectedRoomMode: RoomMode | null;
  roomLoaderTarget: Room | null;
  roomLoaderCreating: boolean;
  needFundsRoom: Room | null;
  joinedTournamentIds: Set<number>;

  loadRooms: () => Promise<void>;
  clearError: () => void;
  setFilter: <K extends keyof RoomFilters>(key: K, value: RoomFilters[K]) => void;
  resetFilters: () => void;
  selectRoom: (room: Room | null, mode: RoomMode | null) => void;
  clearSelectedRoom: () => void;
  showRoomLoader: (room: Room | null, creating?: boolean) => void;
  hideRoomLoader: () => void;
  addRoom: (room: Room) => void;
  setNeedFundsRoom: (room: Room | null) => void;
  clearNeedFundsRoom: () => void;
  registerForTournament: (tournamentId: number) => void;
  isJoinedTournament: (tournamentId: number) => boolean;
}

/**
 * roomStore — list of rooms, filters, selected room, tournament registrations.
 *
 * Initial `rooms` is an empty array (not a fixture): the lobby populates
 * itself from `fetchRooms()` and live socket pushes (`rooms` /
 * `rooms_updated`) on bootstrap. Showing fixtures here would flash a fake
 * lobby for the first paint, then replace it with the real list once the
 * server responds.
 */
export const useRoomStore = create<RoomStoreState>((set, get) => ({
  rooms: [],
  isLoadingRooms: false,
  error: null,
  filters: initialFilters,
  selectedRoom: null,
  selectedRoomMode: null,
  roomLoaderTarget: null,
  roomLoaderCreating: false,
  needFundsRoom: null,
  joinedTournamentIds: new Set<number>(),

  loadRooms: async () => {
    set({ isLoadingRooms: true, error: null });
    try {
      const rooms = await fetchRooms();
      set({ rooms, isLoadingRooms: false });
    } catch (error) {
      set({ isLoadingRooms: false, error });
    }
  },

  clearError: () => set({ error: null }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: initialFilters }),

  selectRoom: (room, mode) => set({ selectedRoom: room, selectedRoomMode: mode }),
  clearSelectedRoom: () => set({ selectedRoom: null, selectedRoomMode: null }),

  showRoomLoader: (room, creating = false) =>
    set({ roomLoaderTarget: room, roomLoaderCreating: creating }),
  hideRoomLoader: () => set({ roomLoaderTarget: null, roomLoaderCreating: false }),

  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),

  setNeedFundsRoom: (room) => set({ needFundsRoom: room }),
  clearNeedFundsRoom: () => set({ needFundsRoom: null }),

  registerForTournament: (tournamentId) =>
    set((state) => {
      const next = new Set(state.joinedTournamentIds);
      next.add(tournamentId);
      return { joinedTournamentIds: next };
    }),

  isJoinedTournament: (tournamentId) => get().joinedTournamentIds.has(tournamentId),
}));

/**
 * Subscribe the store to live `rooms` pushes from the server's
 * `RoomsGateway`. Idempotent — `onSocketEvent` returns a teardown which
 * we ignore (the lobby listens for the entire app lifetime).
 *
 * The server emits two channels:
 *   - `rooms`         — `{ action: 'initial' | 'update', rooms: ServerRoom[] }`
 *                       fired on connect and whenever the room list changes
 *                       on the gateway side.
 *   - `rooms_updated` — bare `ServerRoom[]` broadcast by
 *                       `GameGateway.handleLeaveRoom` after a player exits
 *                       a room. Without subscribing here the lobby misses
 *                       the post-leave update until the next REST poll.
 *
 * Both feed the same store slice; we filter privates (their password is
 * the room id) and map to the client shape so existing components keep
 * working.
 */
type RoomsUpdatedFrame =
  | Array<Parameters<typeof mapServerRoomToClient>[0]>
  | RoomsSocketFrame;

const applyRoomsPayload = (
  rooms: Array<Parameters<typeof mapServerRoomToClient>[0]>,
): void => {
  const mapped = rooms
    .filter((room) => room.type === 'public' || room.isSystem)
    .map(mapServerRoomToClient);
  useRoomStore.setState({ rooms: mapped });
};

/**
 * Subscribe the lobby store to the rooms socket channels.
 *
 * Returns a detacher that unsubscribes both handlers — callers (e.g.
 * `useBootstrap`) should run it from their cleanup so React Strict
 * Mode's double-invocation of effects in dev doesn't stack duplicate
 * handlers and cause every lobby push to fire `applyRoomsPayload`
 * twice. Production single-mount is unaffected.
 */
export const subscribeRoomSocket = (): (() => void) => {
  const offRooms = onSocketEvent<RoomsSocketFrame>('rooms', (frame) => {
    if (!frame || !Array.isArray(frame.rooms)) return;
    applyRoomsPayload(frame.rooms);
  });
  const offRoomsUpdated = onSocketEvent<RoomsUpdatedFrame>(
    'rooms_updated',
    (frame) => {
      if (Array.isArray(frame)) {
        applyRoomsPayload(frame);
        return;
      }
      if (frame && Array.isArray(frame.rooms)) {
        applyRoomsPayload(frame.rooms);
      }
    },
  );
  return () => {
    offRooms();
    offRoomsUpdated();
  };
};
