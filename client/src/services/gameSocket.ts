/**
 * High-level helpers for the game-room socket.io flow.
 *
 * Wraps `services/socket.ts` with svarapro-specific event names and the
 * adapter that translates `GameState` snapshots into v143's
 * `RoomStatePayload`. Components never deal with raw event strings —
 * they call `joinGameRoom(roomId)` / `sendGameAction(...)` instead.
 *
 * Inbound (server → client):
 *   - `game_state`         — full snapshot, one recipient (on join).
 *   - `game_update`        — full snapshot, broadcast to the room.
 *   - `new_chat_message`   — chat broadcast (delivered via subscribers).
 *   - `play_sound`         — server-instructed sound effect (delivered
 *                             via subscribers).
 *   - `error`              — surfaced as a toast.
 *
 * Outbound (client → server):
 *   - `join_room`          — subscribe to a room channel.
 *   - `leave_room`         — unsubscribe (and let the server clean up).
 *   - `sit_down`           — claim a seat for the next round.
 *   - `game_action`        — fold / call / raise / blind / look / open.
 *   - `chat_message`       — send a phrase to the room chat.
 *
 * The adapter (`svaraAdapter.ts`) is the only place that knows both
 * shapes. The bridge keeps the rest of the app protocol-agnostic.
 */

import type {
  SvaraChatMessageEvent,
  SvaraChatMessageRequest,
  SvaraGameActionRequest,
  SvaraGameState,
  SvaraPlayerAction,
  SvaraServerErrorEvent,
  SvaraSitDownRequest,
} from '../api/svaraGame';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useToastStore } from '../store/toastStore';
import { emitSocketEvent, onSocketConnect, onSocketEvent } from './socket';
import { adaptGameStateToSnapshot } from './svaraAdapter';
import { getTelegramUserId } from './telegram';

const SVARA_EVENTS = {
  GAME_STATE: 'game_state',
  GAME_UPDATE: 'game_update',
  NEW_CHAT_MESSAGE: 'new_chat_message',
  PLAY_SOUND: 'play_sound',
  ERROR: 'error',
  BALANCE_UPDATED: 'balanceUpdated',
  TRANSACTION_CONFIRMED: 'transactionConfirmed',

  JOIN: 'join',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SIT_DOWN: 'sit_down',
  GAME_ACTION: 'game_action',
  CHAT_MESSAGE: 'chat_message',
  SUBSCRIBE_BALANCE: 'subscribe_balance',
} as const;

export interface SvaraBalanceUpdatedEvent {
  balance: number | string;
}

export interface SvaraTransactionConfirmedEvent {
  balance: number | string;
  amount: number;
  currency: string;
  message?: string;
}

/**
 * Local monotonically increasing version counter — the svarapro server
 * doesn't ship a snapshot version, so we mint one per applied snapshot
 * to satisfy the reconciliation rule (`incoming >= state.version`).
 *
 * Reset to 0 whenever the user leaves the active room (or switches
 * rooms): `resetRealtime()` zeros `store.version`, and without
 * resetting this counter a stale snapshot that was already in flight
 * for the previous room would arrive with a still-incrementing version
 * (e.g. 6) and be accepted on top of the fresh-room state (version 0).
 */
let snapshotVersion = 0;
const nextSnapshotVersion = (): number => {
  snapshotVersion += 1;
  return snapshotVersion;
};

/**
 * Server-side room id the user is currently joined to. Used to drop
 * snapshots whose `roomId` does not match — a defence-in-depth check
 * for the same in-flight / wrong-room hazard that `snapshotVersion`
 * resets address. `null` while the user is in the lobby.
 */
let currentRoomId: string | null = null;

type Subscriber<P> = (payload: P) => void;

const chatSubscribers = new Set<Subscriber<SvaraChatMessageEvent>>();
const soundSubscribers = new Set<Subscriber<string>>();
const stateSubscribers = new Set<Subscriber<SvaraGameState>>();

const handleSnapshot = (state: SvaraGameState): void => {
  // Wrong-room snapshot — drop it. Without this guard a `game_update`
  // broadcast that was already on the wire when the user left would
  // be applied on top of the new (or empty) realtime slice. The
  // `currentRoomId === null` branch keeps the lobby clean: snapshots
  // arriving before the user has entered any room are ignored.
  if (currentRoomId === null || state.roomId !== currentRoomId) return;
  const tgId = getTelegramUserId();
  const selfTelegramId = tgId !== null ? String(tgId) : undefined;
  const payload = adaptGameStateToSnapshot(state, {
    selfTelegramId,
    version: nextSnapshotVersion(),
  });
  useGameStore.getState().applySnapshot(payload);
  stateSubscribers.forEach((cb) => cb(state));
};

const handleChatMessage = (event: SvaraChatMessageEvent): void => {
  chatSubscribers.forEach((cb) => cb(event));
};

const handlePlaySound = (sound: string): void => {
  soundSubscribers.forEach((cb) => cb(sound));
};

const handleError = (event: SvaraServerErrorEvent): void => {
  if (!event?.message) return;
  useToastStore.getState().pushToast({
    tone: 'error',
    message: event.message,
  });
};

const handleBalanceUpdated = (event: SvaraBalanceUpdatedEvent): void => {
  const next = Number(event?.balance);
  if (!Number.isFinite(next)) return;
  useAuthStore.setState((state) => ({
    user: { ...state.user, balance: next },
  }));
};

const handleTransactionConfirmed = (
  event: SvaraTransactionConfirmedEvent,
): void => {
  const next = Number(event?.balance);
  if (Number.isFinite(next)) {
    useAuthStore.setState((state) => ({
      user: { ...state.user, balance: next },
    }));
  }
  const text = event?.message ?? `+ ${event?.amount ?? ''} ${event?.currency ?? ''}`.trim();
  if (text) {
    useToastStore.getState().pushToast({
      tone: 'success',
      message: text,
    });
  }
};

/**
 * Attach inbound listeners. Returns a detacher that unsubscribes every
 * handler. Call once on app boot (the listeners are no-ops while the
 * socket is closed — pending listeners are replayed on `connect`).
 */
export const attachGameSocketBridge = (): (() => void) => {
  const offs: Array<() => void> = [
    onSocketEvent<SvaraGameState>(SVARA_EVENTS.GAME_STATE, handleSnapshot),
    onSocketEvent<SvaraGameState>(SVARA_EVENTS.GAME_UPDATE, handleSnapshot),
    onSocketEvent<SvaraChatMessageEvent>(
      SVARA_EVENTS.NEW_CHAT_MESSAGE,
      handleChatMessage,
    ),
    onSocketEvent<string>(SVARA_EVENTS.PLAY_SOUND, handlePlaySound),
    onSocketEvent<SvaraServerErrorEvent>(SVARA_EVENTS.ERROR, handleError),
    onSocketEvent<SvaraBalanceUpdatedEvent>(
      SVARA_EVENTS.BALANCE_UPDATED,
      handleBalanceUpdated,
    ),
    onSocketEvent<SvaraTransactionConfirmedEvent>(
      SVARA_EVENTS.TRANSACTION_CONFIRMED,
      handleTransactionConfirmed,
    ),
  ];

  // Track the active room id and reset the snapshot version on every
  // change. The snapshot guard inside `handleSnapshot` uses the latter;
  // the version reset prevents a stale in-flight snapshot from a prior
  // room being treated as "newer" by the realtime slice (its version
  // would still be incrementing past `store.version = 0`).
  currentRoomId =
    useGameStore.getState().activeRoom?.id != null
      ? String(useGameStore.getState().activeRoom?.id)
      : null;
  const unsubscribeRoom = useGameStore.subscribe((state) => {
    const nextRoomId =
      state.activeRoom?.id != null ? String(state.activeRoom.id) : null;
    if (nextRoomId !== currentRoomId) {
      currentRoomId = nextRoomId;
      snapshotVersion = 0;
    }
  });

  return () => {
    for (const off of offs) off();
    unsubscribeRoom();
    currentRoomId = null;
    snapshotVersion = 0;
  };
};

export const joinGameRoom = (roomId: string): void => {
  emitSocketEvent(SVARA_EVENTS.JOIN_ROOM, { roomId });
};

export const leaveGameRoom = (roomId: string): void => {
  emitSocketEvent(SVARA_EVENTS.LEAVE_ROOM, { roomId });
};

export const sitDown = (payload: SvaraSitDownRequest): void => {
  emitSocketEvent(SVARA_EVENTS.SIT_DOWN, payload);
};

export const sendGameAction = (
  roomId: string,
  action: SvaraPlayerAction | 'open' | 'all_in',
  amount?: number,
): void => {
  const payload: SvaraGameActionRequest = { roomId, action };
  if (typeof amount === 'number') payload.amount = amount;
  emitSocketEvent(SVARA_EVENTS.GAME_ACTION, payload);
};

export const sendChatMessage = (roomId: string, phrase: string): void => {
  const payload: SvaraChatMessageRequest = { roomId, phrase };
  emitSocketEvent(SVARA_EVENTS.CHAT_MESSAGE, payload);
};

export const subscribeToBalanceUpdates = (): void => {
  // `subscribe_balance` is the GameGateway's per-socket subscription request
  // (reads telegramId from handshake.auth). `join` is the TransactionGateway's
  // separate `client.join(userId)` call — without it `server.to(userId).emit(
  // 'transactionConfirmed', …)` never reaches us. Both gateways live on the
  // same socket connection, so we emit both on bootstrap.
  //
  // The emits are wired through `onSocketConnect` so every reconnect re-runs
  // them: socket.io transparently reconnects under the hood but the new
  // server-side socket is NOT in any of the rooms the previous one joined,
  // and broadcasts to `telegramId` (balance / transaction confirmed) would
  // silently stop arriving. The hook also fires immediately when the socket
  // is already open at subscription time, so bootstrap order is unchanged.
  onSocketConnect(() => {
    emitSocketEvent(SVARA_EVENTS.SUBSCRIBE_BALANCE);
    const tgId = getTelegramUserId();
    if (tgId !== null) {
      emitSocketEvent(SVARA_EVENTS.JOIN, String(tgId));
    }
  });
};

/**
 * Subscribe to chat broadcasts. Returns an unsubscriber.
 *
 * Kept as a callback API (no zustand store) because chat history is UI
 * state owned by `GameRoom` — the store doesn't need to carry it.
 */
export const subscribeToChat = (
  cb: Subscriber<SvaraChatMessageEvent>,
): (() => void) => {
  chatSubscribers.add(cb);
  return () => {
    chatSubscribers.delete(cb);
  };
};

/** Subscribe to server-initiated sound effects (`play_sound`). */
export const subscribeToSound = (cb: Subscriber<string>): (() => void) => {
  soundSubscribers.add(cb);
  return () => {
    soundSubscribers.delete(cb);
  };
};

/**
 * Subscribe to raw `GameState` snapshots (in addition to the adapted
 * snapshot that lands in `gameStore`). Useful for GameRoom which still
 * needs fields the adapter doesn't carry (status, log, currentBet, …).
 */
export const subscribeToGameState = (
  cb: Subscriber<SvaraGameState>,
): (() => void) => {
  stateSubscribers.add(cb);
  return () => {
    stateSubscribers.delete(cb);
  };
};

/** Internal helpers for tests. */
export const __testing__ = {
  resetSnapshotVersion: (): void => {
    snapshotVersion = 0;
  },
  clearSubscribers: (): void => {
    chatSubscribers.clear();
    soundSubscribers.clear();
    stateSubscribers.clear();
  },
};
