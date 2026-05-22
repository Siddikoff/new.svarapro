/**
 * Rooms / lobby API.
 *
 * `GET /rooms` returns the server's `Room` shape — a wider object than the
 * v143 client cares about (the client only renders ID / number / players /
 * capacity / bet). `mapServerRoomToClient` adapts the response so
 * `roomStore` and the UI keep their existing fields.
 *
 * Private rooms (`type === 'private'`) are filtered out from the lobby
 * list — they're joined via the "Join by code" modal and their password
 * shouldn't leak into the public list anyway.
 *
 * Stage 6 wires the create / join / details modals to the real svarapro
 * endpoints documented in `server/src/modules/rooms/rooms.controller.ts`:
 *
 *   GET  /rooms                       — lobby list (used by stage 2)
 *   GET  /rooms/:roomId/details       — { minBet, playerCount, maxPlayers, status }
 *   POST /rooms        (JWT)          — { minBet, type, password? } → ServerRoom
 *   POST /rooms/:id/join (JWT)        → ServerRoom (also handles spectator fallback)
 *
 * For private rooms the server uses the 6-digit password as the room id,
 * which means "join by code" is just a `POST /rooms/:code/join`.
 */
import { MOCK_ROOMS } from '../data/mocks';
import type { Room } from '../types/domain';
import { httpRequest } from './client';

interface ServerRoom {
  roomId: string;
  minBet: number;
  type: 'public' | 'private';
  players: string[];
  spectators?: string[];
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  password?: string;
  isSystem?: boolean;
}

interface ServerRoomDetails {
  minBet: number;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

const apiConfigured = (): boolean => Boolean(import.meta.env?.VITE_API_BASE_URL);

const mapServerRoomToClient = (room: ServerRoom): Room => {
  const num = Number.parseInt(room.roomId, 10);
  return {
    id: room.roomId,
    // Private rooms use the password as the ID, which may not be numeric;
    // fall back to 0 so the card still renders without crashing.
    num: Number.isFinite(num) ? num : 0,
    players: room.players.length,
    max: room.maxPlayers,
    bet: room.minBet,
    ...(room.password ? { password: room.password } : {}),
  };
};

/**
 * Fetch the active room list.
 *
 * When `VITE_API_BASE_URL` is unset (local dev / preview without a
 * backend) the function falls back to `MOCK_ROOMS` so the UI keeps
 * something to render and visual smoke tests still pass.
 */
export const fetchRooms = async (): Promise<Room[]> => {
  if (!apiConfigured()) return MOCK_ROOMS;

  const data = await httpRequest<ServerRoom[]>('/rooms');
  if (!Array.isArray(data)) return [];

  return data
    .filter((room) => room.type === 'public' || room.isSystem)
    .map(mapServerRoomToClient);
};

/**
 * Look up a room by id via `GET /rooms/:roomId/details`.
 *
 * The details endpoint is intentionally lean — it returns only the
 * fields the join screen actually needs (min bet, player count, status).
 * We project that into the v143 `Room` shape so existing UI doesn't
 * need to know about two flavours of room objects.
 *
 * Offline (no `VITE_API_BASE_URL`) we resolve from the mock list so
 * preview builds keep working.
 */
export const fetchRoomById = async (roomId: number | string): Promise<Room | null> => {
  if (!apiConfigured()) {
    return MOCK_ROOMS.find(
      (room) => room.id === roomId || String(room.num) === String(roomId),
    ) ?? null;
  }

  const details = await httpRequest<ServerRoomDetails>(`/rooms/${roomId}/details`);
  if (!details) return null;

  const numeric = Number.parseInt(String(roomId), 10);
  return {
    id: String(roomId),
    num: Number.isFinite(numeric) ? numeric : 0,
    players: details.playerCount,
    max: details.maxPlayers,
    bet: details.minBet,
  };
};

/**
 * Look up a (typically private) room by share code. The code is just
 * the room id on the server — for private rooms that's the 6-digit
 * password, for public ones it's the 4-digit auto-generated id.
 *
 * Returns `null` when the server reports the room doesn't exist so
 * callers can surface a "room not found" message.
 */
export const joinRoomByCode = async (code: string | number): Promise<Room | null> => {
  if (!apiConfigured()) {
    return MOCK_ROOMS.find((room) => String(room.num) === String(code)) ?? null;
  }
  return fetchRoomById(code);
};

export interface CreateRoomInput {
  /** Min bet in USDT. Server enforces `>= 1`. */
  minBet: number;
  /** `'public'` shows in the lobby, `'private'` is code-only. */
  type: 'public' | 'private';
  /** Exactly 6 digits for private rooms; ignored when `type === 'public'`. */
  password?: string;
}

/**
 * Create a new room via `POST /rooms`. Returns the full server room
 * (mapped to the client shape) so callers can navigate straight into
 * the lobby card / game-room route without an extra fetch.
 */
export const createRoom = async (input: CreateRoomInput): Promise<Room> => {
  if (input.type === 'private') {
    if (!input.password || !/^\d{6}$/.test(input.password)) {
      throw new Error('Password must be exactly 6 digits');
    }
  }
  if (!Number.isFinite(input.minBet) || input.minBet < 1) {
    throw new Error('Minimum bet must be at least $1');
  }

  if (!apiConfigured()) {
    // Mock branch — generate a plausible room locally so the UI keeps
    // a working create-flow during offline previews. Public rooms get
    // a random 4-digit id (matches server behaviour); private rooms
    // reuse the password as the id.
    const roomId =
      input.type === 'private'
        ? input.password!
        : String(Math.floor(1000 + Math.random() * 9000));
    return mapServerRoomToClient({
      roomId,
      minBet: input.minBet,
      type: input.type,
      players: [],
      status: 'waiting',
      maxPlayers: 6,
      ...(input.password ? { password: input.password } : {}),
    });
  }

  const response = await httpRequest<ServerRoom>('/rooms', {
    method: 'POST',
    body: {
      minBet: input.minBet,
      type: input.type,
      ...(input.password ? { password: input.password } : {}),
    },
  });
  if (!response) throw new Error('Empty room creation response');
  return mapServerRoomToClient(response);
};

/**
 * Join an existing room by id (`POST /rooms/:id/join`).
 *
 * The server transparently downgrades the join to a spectator slot when
 * the room is already full, so the returned `Room` is the same shape
 * either way — callers don't have to special-case capacity.
 */
export const joinRoom = async (roomId: string | number): Promise<Room> => {
  if (!apiConfigured()) {
    const local = MOCK_ROOMS.find(
      (room) => room.id === roomId || String(room.num) === String(roomId),
    );
    if (!local) throw new Error('Room not found');
    return local;
  }

  const response = await httpRequest<ServerRoom>(`/rooms/${roomId}/join`, {
    method: 'POST',
  });
  if (!response) throw new Error('Room not found');
  return mapServerRoomToClient(response);
};

/** Internal helper exported for unit tests. */
export const __testing__ = { mapServerRoomToClient };
