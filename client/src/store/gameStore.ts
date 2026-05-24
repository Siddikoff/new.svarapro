import type { StateCreator } from 'zustand';
import { create } from 'zustand';

import type {
  GamePhase,
  GameTickPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  RoomStatePayload,
  RoundResultPayload,
  SeatId,
  SeatMap,
  SeatState,
} from '../shared/protocol';
import type { Room } from '../types/domain';

export const GAME_MODES = {
  join: 'join',
  watch: 'watch',
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

/**
 * GamePhase / SeatState / SeatId / RoomStatePayload / GameTickPayload /
 * PlayerJoinedPayload / PlayerLeftPayload / RoundResultPayload all come
 * from `src/shared/protocol` so this slice and the WebSocket validator
 * speak the exact same language — no parallel "client-side" shape.
 */
export type { GamePhase, SeatId, SeatState };

export const GAME_PHASES = {
  idle: 'idle',
  dealing: 'dealing',
  betting: 'betting',
  showdown: 'showdown',
  roundEnd: 'round_end',
} as const satisfies Record<string, GamePhase>;

/** Server snapshot — re-exported for callers that still import it locally. */
export type RoomSnapshot = RoomStatePayload;
export type { GameTickPayload, PlayerJoinedPayload, PlayerLeftPayload, RoundResultPayload };

export interface SessionSlice {
  activeRoom: Room | null;
  mode: GameMode;
  enterRoom: (room: Room, mode?: GameMode) => void;
  exitRoom: () => void;
}

export interface RealtimeSlice {
  seats: SeatMap;
  pot: number;
  phase: GamePhase;
  lastTick: GameTickPayload | null;
  winnerId: SeatId | null;
  /**
   * Seat whose turn it currently is. Mirrors the server's
   * `currentPlayerIndex` (translated to a SeatId by the adapter)
   * during the `betting` / `blind_betting` phases; `null` when no
   * one is on the clock (dealing, showdown, round_end, idle).
   *
   * UI consumers select on this to draw the turn ring / timer.
   */
  activeSeatId: SeatId | null;
  /**
   * Last applied `RoomState.version`. Tick / snapshot frames with a
   * version below this value are stale (out-of-order delivery) and
   * should be dropped by the bridge.
   */
  version: number;
  /**
   * Last applied `GameTickPayload.t` (server-side ms). Used to drop
   * out-of-order ticks within the same version — the older tick is
   * dropped rather than overwriting newer state.
   */
  lastTickT: number;
  /**
   * Number of frames the realtime layer rejected because they were
   * older than the currently applied state. Useful for diagnostics
   * ("how lossy is the server stream right now?").
   */
  desyncCount: number;
  applySnapshot: (snapshot: RoomSnapshot) => void;
  applyTick: (tick: GameTickPayload) => void;
  applyPlayerJoined: (payload: PlayerJoinedPayload) => void;
  applyPlayerLeft: (payload: PlayerLeftPayload) => void;
  applyRoundResult: (result: RoundResultPayload) => void;
  /** Hard reset of realtime state — used when leaving a room. */
  resetRealtime: () => void;
}

export type GameStoreState = SessionSlice & RealtimeSlice;

/**
 * Slice helpers — defined as factories so each slice owns its own initial
 * shape and is independently testable. Composed together below into a
 * single zustand store. When the codebase grows, slices can be split into
 * their own files without touching consumers (selectors stay the same).
 */

// Session slice: which room is open, in what mode. Kept tiny so the rest of
// the app can react (hide nav bar, lazy-load GameRoom, suspend BackButton).
const createSessionSlice: StateCreator<GameStoreState, [], [], SessionSlice> = (set, get) => ({
  activeRoom: null,
  mode: GAME_MODES.join,

  enterRoom: (room, mode = GAME_MODES.join) => set({ activeRoom: room, mode }),
  exitRoom: () => {
    // Reset realtime state on exit so the next room boots clean. Delegating
    // to `resetRealtime` keeps the field list in a single place — adding a
    // new realtime field only needs to touch that reducer.
    get().resetRealtime();
    set({ activeRoom: null });
  },
});

// Realtime slice: shape of the server-driven game state. Today the GameRoom
// runs from a local mock; once the backend is wired, the WebSocket bridge
// (see `src/websocket/storeBridge.ts`) will call these `apply*` actions in
// response to `WS_EVENTS.ROOM_STATE`, `GAME_TICK`, etc. The reducers stay
// pure so they can be unit-tested without React.
//
// Reconciliation rules:
//   - `applySnapshot` accepts only versions ≥ the current one. Older
//     snapshots are dropped (`desyncCount` is bumped) so a stale
//     `room:state` reply can never overwrite fresher local state.
//   - `applyTick` requires `tick.version == state.version` and
//     `tick.t > state.lastTickT`. Anything else is treated as stale.
//   - When a tick is dropped because of a *version mismatch* (gap or
//     reset), the bridge is expected to call `wsClient.send(REQUEST_SNAPSHOT)`
//     to resync. The slice itself doesn't talk to the wire.
const createRealtimeSlice: StateCreator<GameStoreState, [], [], RealtimeSlice> = (set) => ({
  seats: {},
  pot: 0,
  phase: GAME_PHASES.idle,
  lastTick: null,
  winnerId: null,
  activeSeatId: null,
  version: 0,
  lastTickT: 0,
  desyncCount: 0,

  applySnapshot: (snapshot) =>
    set((state) => {
      const incoming = snapshot.version ?? state.version;
      if (incoming < state.version) {
        return { desyncCount: state.desyncCount + 1 };
      }
      return {
        seats: snapshot.seats ?? {},
        pot: snapshot.pot ?? 0,
        phase: snapshot.phase ?? GAME_PHASES.idle,
        winnerId: snapshot.winnerId ?? null,
        activeSeatId: snapshot.activeSeatId ?? null,
        version: incoming,
        // Snapshots reset the per-tick clock — next tick.t must be > 0.
        lastTickT: 0,
      };
    }),

  applyTick: (tick) =>
    set((state) => {
      const tickVersion = tick.version ?? state.version;
      // Out-of-order or wrong-room version — drop.
      if (tickVersion !== state.version || tick.t <= state.lastTickT) {
        return { desyncCount: state.desyncCount + 1 };
      }
      return {
        lastTick: tick,
        lastTickT: tick.t,
        seats: tick.seats ? { ...state.seats, ...tick.seats } : state.seats,
        pot: tick.pot ?? state.pot,
        phase: tick.phase ?? state.phase,
        // Ticks may also carry an updated `activeSeatId` (turn moved to
        // the next player without a full snapshot). `undefined` keeps
        // the existing value so non-betting ticks don't wipe the ring.
        activeSeatId:
          tick.activeSeatId === undefined ? state.activeSeatId : tick.activeSeatId,
      };
    }),

  applyPlayerJoined: (payload) =>
    set((state) => ({
      seats: { ...state.seats, [String(payload.seatId)]: payload.seat },
    })),

  applyPlayerLeft: (payload) =>
    set((state) => {
      const next = { ...state.seats };
      delete next[String(payload.seatId)];
      return { seats: next };
    }),

  applyRoundResult: (result) =>
    set({
      phase: GAME_PHASES.roundEnd,
      winnerId: result.winnerId ?? null,
    }),

  resetRealtime: () =>
    set({
      seats: {},
      pot: 0,
      phase: GAME_PHASES.idle,
      lastTick: null,
      winnerId: null,
      activeSeatId: null,
      version: 0,
      lastTickT: 0,
      desyncCount: 0,
    }),
});

/**
 * gameStore — composes session + realtime slices.
 *
 * Today: the GameRoom screen still manages its detailed internal state
 * (seats animations, deal order, chosen seat). This is intentional — the
 * animation timeline runs at 60fps and would re-render the world on every
 * frame if it lived in the store.
 *
 * Tomorrow (backend live): the realtime slice will own canonical game
 * state (seats, pot, phase) pushed from the server, and GameRoom will
 * read it via selectors. Local animation state stays inside GameRoom.
 */
export const useGameStore = create<GameStoreState>()((...args) => ({
  ...createSessionSlice(...args),
  ...createRealtimeSlice(...args),
}));
