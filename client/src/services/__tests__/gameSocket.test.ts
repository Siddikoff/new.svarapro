/**
 * `gameSocket` bridge — integration test against an in-memory fake of
 * the socket layer.
 *
 * We mock `services/socket` so the bridge can be exercised end-to-end:
 *   - `onSocketEvent` collects handlers per event name.
 *   - `emitSocketEvent` records every outbound emit.
 *
 * Tests assert that inbound `game_state` / `game_update` snapshots
 * land in `gameStore` via the adapter, that the version counter is
 * monotonic, that `error` events surface as toasts, and that the
 * outbound API (`joinGameRoom`, `sendGameAction`, ...) forwards the
 * right payloads on the right channels.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SvaraGameState } from '../../api/svaraGame';

const handlers = new Map<string, Set<(payload: unknown) => void>>();
const emits: Array<{ event: string; payload?: unknown }> = [];

const connectHandlers = new Set<() => void>();

vi.mock('../socket', () => ({
  onSocketEvent: (event: string, cb: (payload: unknown) => void) => {
    const bucket = handlers.get(event) ?? new Set();
    bucket.add(cb);
    handlers.set(event, bucket);
    return () => bucket.delete(cb);
  },
  emitSocketEvent: (event: string, payload?: unknown) => {
    emits.push({ event, payload });
  },
  // Simulate "already connected": fire immediately so the production
  // bootstrap order (subscribeToBalanceUpdates after connectSocket) is
  // preserved in tests.
  onSocketConnect: (cb: () => void) => {
    connectHandlers.add(cb);
    cb();
    return () => connectHandlers.delete(cb);
  },
}));

vi.mock('../telegram', () => ({
  getTelegramUserId: () => 111,
}));

import {
  __testing__,
  attachGameSocketBridge,
  joinGameRoom,
  leaveGameRoom,
  sendChatMessage,
  sendGameAction,
  sitDown,
  subscribeToBalanceUpdates,
  subscribeToChat,
  subscribeToGameState,
  subscribeToSound,
} from '../gameSocket';
import { useGameStore } from '../../store/gameStore';
import { useToastStore } from '../../store/toastStore';

const fire = (event: string, payload: unknown): void => {
  const bucket = handlers.get(event);
  if (!bucket) return;
  for (const cb of bucket) cb(payload);
};

const snapshot = (overrides: Partial<SvaraGameState> = {}): SvaraGameState => ({
  roomId: '1',
  status: 'betting',
  players: [
    {
      id: '111',
      username: 'me',
      avatar: null,
      balance: 1000,
      tableBalance: 100,
      cards: [{ suit: 'spades', rank: 'A', value: 14 }],
      isActive: true,
      isDealer: false,
      hasFolded: false,
      hasLooked: true,
      currentBet: 10,
      totalBet: 10,
      position: 0,
    },
    {
      id: '222',
      username: 'bob',
      avatar: null,
      balance: 1000,
      tableBalance: 100,
      cards: [{ suit: 'hearts', rank: 'K', value: 13 }],
      isActive: true,
      isDealer: true,
      hasFolded: false,
      hasLooked: false,
      currentBet: 0,
      totalBet: 0,
      position: 1,
    },
  ],
  pot: 20,
  currentPlayerIndex: 0,
  dealerIndex: 1,
  minBet: 1,
  currentBet: 10,
  lastBlindBet: 0,
  lastActionAmount: 10,
  rake: 0,
  winners: [],
  isSvara: false,
  round: 1,
  log: [],
  ...overrides,
});

// Room fixture used to seat the user before the bridge attaches — the
// new wrong-room guard in `handleSnapshot` drops any frame whose
// `roomId` doesn't match the active room. Shape matches the `Room`
// domain interface (the realtime slice only reads `id`).
const roomFixture = (id: number | string = '1') => ({
  id,
  num: 1,
  players: 0,
  max: 6,
  bet: 1,
});

describe('gameSocket bridge', () => {
  beforeEach(() => {
    handlers.clear();
    connectHandlers.clear();
    emits.length = 0;
    __testing__.resetSnapshotVersion();
    __testing__.clearSubscribers();
    useGameStore.getState().resetRealtime();
    // Default: user seated in room '1'. Tests that exercise the
    // wrong-room guard explicitly override `activeRoom` to test the
    // mismatch case.
    useGameStore.setState({ activeRoom: roomFixture('1') });
    useToastStore.getState().clearToasts();
  });

  it('applies an inbound game_state snapshot to gameStore', () => {
    attachGameSocketBridge();
    fire('game_state', snapshot());
    const s = useGameStore.getState();
    expect(s.pot).toBe(20);
    expect(s.version).toBe(1);
    expect(Object.keys(s.seats)).toEqual(['0', '1']);
  });

  it('reveals only the local seat hand outside showdown', () => {
    attachGameSocketBridge();
    fire('game_state', snapshot());
    const s = useGameStore.getState();
    expect(s.seats['0']?.hand).toEqual([{ suit: 'spade', rank: 'A' }]);
    expect(s.seats['1']?.hand).toBeUndefined();
    expect(s.seats['1']?.cardCount).toBe(1);
  });

  it('keeps the snapshot version monotonic across game_update frames', () => {
    attachGameSocketBridge();
    fire('game_update', snapshot());
    fire('game_update', snapshot({ pot: 30 }));
    fire('game_update', snapshot({ pot: 40 }));
    const s = useGameStore.getState();
    expect(s.version).toBe(3);
    expect(s.pot).toBe(40);
  });

  it('routes server error frames into toastStore', () => {
    attachGameSocketBridge();
    fire('error', { message: 'Game not found' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ tone: 'error', message: 'Game not found' });
  });

  it('forwards chat broadcasts to subscribers', () => {
    attachGameSocketBridge();
    const seen: Array<{ playerId: string; phrase: string }> = [];
    const off = subscribeToChat((msg) => seen.push(msg));
    fire('new_chat_message', { playerId: '222', phrase: ':)' });
    expect(seen).toEqual([{ playerId: '222', phrase: ':)' }]);
    off();
    fire('new_chat_message', { playerId: '222', phrase: ':(' });
    expect(seen).toHaveLength(1);
  });

  it('forwards play_sound to subscribers', () => {
    attachGameSocketBridge();
    const seen: string[] = [];
    subscribeToSound((s) => seen.push(s));
    fire('play_sound', 'chip');
    fire('play_sound', 'deal');
    expect(seen).toEqual(['chip', 'deal']);
  });

  it('forwards raw GameState to subscribers in addition to the store', () => {
    attachGameSocketBridge();
    const seen: SvaraGameState[] = [];
    subscribeToGameState((s) => seen.push(s));
    fire('game_state', snapshot());
    expect(seen).toHaveLength(1);
    expect(seen[0].pot).toBe(20);
  });

  it('exposes joinGameRoom / leaveGameRoom emits', () => {
    joinGameRoom('42');
    leaveGameRoom('42');
    expect(emits).toEqual([
      { event: 'join_room', payload: { roomId: '42' } },
      { event: 'leave_room', payload: { roomId: '42' } },
    ]);
  });

  it('sends game_action with optional amount', () => {
    sendGameAction('1', 'fold');
    sendGameAction('1', 'raise', 50);
    expect(emits).toEqual([
      { event: 'game_action', payload: { roomId: '1', action: 'fold' } },
      { event: 'game_action', payload: { roomId: '1', action: 'raise', amount: 50 } },
    ]);
  });

  it('sends chat_message and sit_down payloads verbatim', () => {
    sendChatMessage('1', 'hi');
    sitDown({
      roomId: '1',
      position: 2,
      userData: { username: 'me', avatar: '' },
    });
    subscribeToBalanceUpdates();
    expect(emits).toEqual([
      { event: 'chat_message', payload: { roomId: '1', phrase: 'hi' } },
      {
        event: 'sit_down',
        payload: { roomId: '1', position: 2, userData: { username: 'me', avatar: '' } },
      },
      // `subscribe_balance` is the GameGateway's per-socket subscription; `join`
      // is the TransactionGateway's per-user room join — both are required so
      // `balanceUpdated` and `transactionConfirmed` push events actually arrive.
      { event: 'subscribe_balance', payload: undefined },
      { event: 'join', payload: '111' },
    ]);
  });

  it('drops snapshots whose roomId does not match the active room', () => {
    // Active room is '1' (set in beforeEach). A snapshot for room '2'
    // (e.g. a stale in-flight broadcast from a previous room) must be
    // ignored — applying it would paint the previous room's seats onto
    // the fresh realtime slice and break the next round.
    attachGameSocketBridge();
    fire('game_state', snapshot({ roomId: '2' }));
    const s = useGameStore.getState();
    expect(s.pot).toBe(0);
    expect(s.version).toBe(0);
    expect(Object.keys(s.seats)).toEqual([]);
  });

  it('drops snapshots when there is no active room (lobby)', () => {
    // Override the default room set in beforeEach — pretend the user
    // is sitting in the lobby. Any snapshot frame is suspicious and
    // must not poison the realtime slice.
    useGameStore.setState({ activeRoom: null });
    attachGameSocketBridge();
    fire('game_state', snapshot());
    const s = useGameStore.getState();
    expect(s.version).toBe(0);
    expect(Object.keys(s.seats)).toEqual([]);
  });

  it('resets snapshot version when the active room changes', () => {
    attachGameSocketBridge();
    fire('game_state', snapshot());
    expect(useGameStore.getState().version).toBe(1);

    // Switch rooms — the realtime slice would normally be reset by
    // `useGameSocket`'s cleanup, but here we exercise the bridge's
    // own reset of `snapshotVersion`. The next snapshot must start
    // again from version 1 rather than continuing at 2.
    useGameStore.getState().resetRealtime();
    useGameStore.setState({ activeRoom: roomFixture('2') });
    fire('game_state', snapshot({ roomId: '2' }));
    expect(useGameStore.getState().version).toBe(1);
  });

  it('re-emits subscribe_balance and join on every reconnect', () => {
    subscribeToBalanceUpdates();
    // First connect already fired inside `onSocketConnect` (the mock
    // fires immediately). Simulate a reconnect by replaying every
    // registered connect callback.
    emits.length = 0;
    for (const cb of connectHandlers) cb();
    expect(emits).toEqual([
      { event: 'subscribe_balance', payload: undefined },
      { event: 'join', payload: '111' },
    ]);
  });
});
