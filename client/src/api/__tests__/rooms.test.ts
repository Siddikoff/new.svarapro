import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRoom, fetchRoomById, joinRoom, joinRoomByCode, __testing__ } from '../rooms';

const { mapServerRoomToClient } = __testing__;

const originalEnv = { ...import.meta.env };

afterEach(() => {
  Object.assign(import.meta.env, originalEnv);
  vi.restoreAllMocks();
});

describe('mapServerRoomToClient', () => {
  it('maps a public room to the client shape', () => {
    const result = mapServerRoomToClient({
      roomId: '1337',
      minBet: 5,
      type: 'public',
      players: ['111', '222', '333'],
      status: 'waiting',
      maxPlayers: 6,
    });

    expect(result).toEqual({
      id: '1337',
      num: 1337,
      players: 3,
      max: 6,
      bet: 5,
    });
  });

  it('falls back to num=0 when roomId is non-numeric (private rooms use a password as id)', () => {
    const result = mapServerRoomToClient({
      roomId: 'secret-xyz',
      minBet: 10,
      type: 'private',
      players: [],
      status: 'waiting',
      maxPlayers: 4,
      password: 'secret-xyz',
    });

    expect(result.num).toBe(0);
    expect(result.id).toBe('secret-xyz');
    expect(result.password).toBe('secret-xyz');
  });

  it('treats players as a count, not an array, in the client shape', () => {
    const result = mapServerRoomToClient({
      roomId: '42',
      minBet: 1,
      type: 'public',
      players: [],
      status: 'waiting',
      maxPlayers: 6,
    });

    expect(result.players).toBe(0);
  });
});

describe('createRoom (offline / mock)', () => {
  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
  });

  it('returns a mock public room with a 4-digit numeric id', async () => {
    const room = await createRoom({ minBet: 5, type: 'public' });
    expect(room.bet).toBe(5);
    expect(room.players).toBe(0);
    expect(String(room.id)).toMatch(/^\d{4}$/);
    expect(room.password).toBeUndefined();
  });

  it('uses the password as the id for private rooms', async () => {
    const room = await createRoom({
      minBet: 2,
      type: 'private',
      password: '123456',
    });
    expect(room.id).toBe('123456');
    expect(room.password).toBe('123456');
  });

  it('rejects private rooms with a non-6-digit password', async () => {
    await expect(
      createRoom({ minBet: 1, type: 'private', password: '12' }),
    ).rejects.toThrow(/6 digits/);
    await expect(
      createRoom({ minBet: 1, type: 'private', password: 'abcdef' }),
    ).rejects.toThrow(/6 digits/);
  });

  it('rejects sub-$1 bets', async () => {
    await expect(createRoom({ minBet: 0, type: 'public' })).rejects.toThrow(/\$1/);
  });
});

describe('createRoom (online)', () => {
  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL =
      'https://api.test/v1';
  });

  it('posts the create payload and maps the server response', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: '4321',
          minBet: 10,
          type: 'public',
          players: ['1'],
          spectators: [],
          status: 'waiting',
          maxPlayers: 6,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const room = await createRoom({ minBet: 10, type: 'public' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/rooms');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({ minBet: 10, type: 'public' });
    expect(room).toEqual({ id: '4321', num: 4321, players: 1, max: 6, bet: 10 });
  });

  it('sends the password when type is private', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: '654321',
          minBet: 3,
          type: 'private',
          players: [],
          spectators: [],
          status: 'waiting',
          maxPlayers: 6,
          password: '654321',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await createRoom({ minBet: 3, type: 'private', password: '654321' });

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({ minBet: 3, type: 'private', password: '654321' });
  });
});

describe('joinRoom', () => {
  beforeEach(() => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
  });

  it('resolves to a mock room when one with the given id exists', async () => {
    const room = await joinRoom(1);
    expect(room.id).toBeDefined();
  });

  it('throws on missing mock room', async () => {
    await expect(joinRoom('does-not-exist')).rejects.toThrow(/not found/);
  });

  it('posts to /rooms/:id/join when configured', async () => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL =
      'https://api.test/v1';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: '4321',
          minBet: 10,
          type: 'public',
          players: ['1', '2'],
          spectators: [],
          status: 'waiting',
          maxPlayers: 6,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const room = await joinRoom('4321');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/rooms/4321/join');
    expect(init?.method).toBe('POST');
    expect(room.players).toBe(2);
  });
});

describe('fetchRoomById', () => {
  it('returns a mock room when API is not configured', async () => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
    const room = await fetchRoomById(1);
    expect(room).not.toBeNull();
  });

  it('hits /rooms/:roomId/details when API is configured', async () => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL =
      'https://api.test/v1';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          minBet: 7,
          playerCount: 2,
          maxPlayers: 6,
          status: 'waiting',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const room = await fetchRoomById('9876');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/rooms/9876/details');
    expect(room).toEqual({ id: '9876', num: 9876, players: 2, max: 6, bet: 7 });
  });
});

describe('joinRoomByCode', () => {
  it('falls back to mocks when offline', async () => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL = '';
    const room = await joinRoomByCode(1);
    // Mocks may or may not include a room with num=1, but the function
    // shouldn't throw and should resolve to either a room or null.
    expect(room === null || typeof room === 'object').toBe(true);
  });

  it('proxies to fetchRoomById when API is configured', async () => {
    (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL =
      'https://api.test/v1';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          minBet: 1,
          playerCount: 0,
          maxPlayers: 6,
          status: 'waiting',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const room = await joinRoomByCode('123456');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/rooms/123456/details');
    expect(room?.id).toBe('123456');
  });
});
