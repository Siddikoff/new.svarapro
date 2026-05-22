/**
 * connectionStore \u2014 reactive view over the WebSocket connection.
 *
 * The actual transport (open/close/send) lives in `websocket/client.ts`.
 * This store mirrors the status as plain reactive state so components
 * can subscribe to `useConnectionStore(s => s.status)` without poking
 * the client directly.
 *
 * The client publishes lifecycle events into this store; reducers stay
 * tiny and pure so unit tests can drive them without a real socket.
 */
import { create } from 'zustand';

export const CONNECTION_STATUS = {
  idle: 'idle',
  connecting: 'connecting',
  open: 'open',
  closing: 'closing',
  closed: 'closed',
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

export interface ConnectionStoreState {
  /** Current socket lifecycle phase. */
  status: ConnectionStatus;
  /** Number of consecutive reconnect attempts since the last `open`. */
  reconnectAttempts: number;
  /**
   * Server-reported / measured round-trip time for the last successful
   * ping/pong, in ms. `null` if no measurement yet.
   */
  lastRttMs: number | null;
  /**
   * Last time (ms epoch) the client received any frame from the server
   * \u2014 used by UI for "Last sync XXs ago" indicators and for desync
   * timers.
   */
  lastFrameAt: number | null;
  /**
   * Tally of frames the protocol layer dropped because they failed
   * runtime validation. Bumped in dev / production both \u2014 cheap and
   * useful for diagnostics. Never resets so a slow leak is visible.
   */
  malformedFrames: number;
  /** Whether the heartbeat has detected a stale socket (no pong in time). */
  isStale: boolean;

  setStatus: (status: ConnectionStatus) => void;
  setReconnectAttempts: (attempts: number) => void;
  recordPong: (rttMs: number) => void;
  recordFrame: () => void;
  recordMalformed: () => void;
  setStale: (isStale: boolean) => void;
  reset: () => void;
}

const initial = {
  status: CONNECTION_STATUS.idle,
  reconnectAttempts: 0,
  lastRttMs: null,
  lastFrameAt: null,
  malformedFrames: 0,
  isStale: false,
} satisfies Pick<
  ConnectionStoreState,
  'status' | 'reconnectAttempts' | 'lastRttMs' | 'lastFrameAt' | 'malformedFrames' | 'isStale'
>;

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  ...initial,

  setStatus: (status) => set({ status }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  recordPong: (rttMs) => set({ lastRttMs: rttMs, isStale: false }),
  recordFrame: () => set({ lastFrameAt: Date.now() }),
  recordMalformed: () => set((state) => ({ malformedFrames: state.malformedFrames + 1 })),
  setStale: (isStale) => set({ isStale }),
  reset: () => set(initial),
}));
