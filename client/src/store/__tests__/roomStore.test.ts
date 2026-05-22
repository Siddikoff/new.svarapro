import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/socket', () => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  return {
    __handlers: handlers,
    onSocketEvent: vi.fn((event: string, handler: (payload: unknown) => void) => {
      const bucket = handlers.get(event) ?? new Set();
      bucket.add(handler);
      handlers.set(event, bucket);
      return () => bucket.delete(handler);
    }),
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    emitSocketEvent: vi.fn(),
    isSocketConnected: vi.fn(() => false),
  };
});

import * as socketModule from '../../services/socket';
import { subscribeRoomSocket, useRoomStore } from '../roomStore';

interface MockedSocket {
  __handlers: Map<string, Set<(payload: unknown) => void>>;
}

const getHandlers = (): Map<string, Set<(payload: unknown) => void>> =>
  (socketModule as unknown as MockedSocket).__handlers;

const fireRoomsFrame = (frame: unknown): void => {
  getHandlers()
    .get('rooms')
    ?.forEach((h) => h(frame));
};

describe('roomStore — socket subscription', () => {
  beforeEach(() => {
    getHandlers().clear();
    useRoomStore.setState({ rooms: [] });
  });

  it('maps an initial `rooms` push from the server gateway into the store', () => {
    subscribeRoomSocket();
    fireRoomsFrame({
      action: 'initial',
      rooms: [
        {
          roomId: '101',
          minBet: 1,
          type: 'public',
          players: ['a', 'b'],
          status: 'waiting',
          maxPlayers: 6,
        },
      ],
    });

    const rooms = useRoomStore.getState().rooms;
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ id: '101', num: 101, players: 2, max: 6, bet: 1 });
  });

  it('filters private rooms out of the lobby list', () => {
    subscribeRoomSocket();
    fireRoomsFrame({
      action: 'update',
      rooms: [
        {
          roomId: '777',
          minBet: 2,
          type: 'public',
          players: [],
          status: 'waiting',
          maxPlayers: 4,
        },
        {
          roomId: 'shhh',
          minBet: 5,
          type: 'private',
          players: ['x'],
          status: 'waiting',
          maxPlayers: 6,
          password: 'shhh',
        },
      ],
    });

    const rooms = useRoomStore.getState().rooms;
    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe('777');
  });

  it('keeps system rooms even when their type is not public', () => {
    subscribeRoomSocket();
    fireRoomsFrame({
      action: 'initial',
      rooms: [
        {
          roomId: '1',
          minBet: 1,
          type: 'private',
          players: [],
          status: 'waiting',
          maxPlayers: 6,
          isSystem: true,
        },
      ],
    });

    expect(useRoomStore.getState().rooms).toHaveLength(1);
  });

  it('ignores malformed pushes silently', () => {
    subscribeRoomSocket();
    useRoomStore.setState({ rooms: [] });
    fireRoomsFrame(null);
    fireRoomsFrame({ action: 'initial' });
    fireRoomsFrame({ rooms: 'not an array' });
    expect(useRoomStore.getState().rooms).toEqual([]);
  });
});
