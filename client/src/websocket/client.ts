import {
  CLIENT_EVENTS,
  parseServerFrame,
  type ServerToClientEvents,
  WS_EVENTS,
  type WsEventName,
} from '../shared/protocol';
import { CONNECTION_STATUS, useConnectionStore } from '../store/connectionStore';

/**
 * Minimal WebSocket client for the game backend.
 *
 * Today there is no backend, so by default the client is "offline": calls to
 * `send` are buffered and listeners can be registered safely. As soon as
 * `VITE_WS_URL` is set, `connect()` opens a real socket, replays the buffer,
 * and starts dispatching incoming messages.
 *
 * Frames on the wire are JSON `{ type, payload }`. Inbound frames are
 * validated against the `shared/protocol` schemas before being dispatched
 * to listeners \u2014 malformed frames are logged and dropped so a bad payload
 * can never crash a reducer or corrupt the store.
 *
 * Stability features:
 *   - **Heartbeat / pong-timeout**: every `HEARTBEAT_INTERVAL_MS` the
 *     client sends a `ping` with a monotonic timestamp. If no `pong`
 *     arrives within `PONG_TIMEOUT_MS`, the socket is considered dead and
 *     forcibly closed \u2014 the existing reconnect loop then takes over.
 *   - **Connection status**: every state change (idle\u2192connecting\u2192open\u2192
 *     closing\u2192closed) is mirrored into `useConnectionStore` so React
 *     components can react without polling the client instance.
 *   - **Malformed-frame counter**: protocol-validation drops are tallied
 *     in the store for diagnostics.
 *   - **Exponential-backoff reconnect** (preserved from v31).
 *   - **on('open'/'reconnect') hooks**: callers can subscribe to socket
 *     lifecycle to refresh server-authoritative state on reconnect.
 */

export type WsPayload = unknown;
export type WsListener<P = WsPayload> = (payload: P) => void;
export type WsUnsubscribe = () => void;
export type WsLifecycleEvent = 'open' | 'reconnect' | 'close';
export type WsLifecycleListener = () => void;

/** Strongly-typed listener for the canonical server-to-client events. */
export type WsTypedListener<E extends keyof ServerToClientEvents> = (
  payload: ServerToClientEvents[E],
) => void;

const HEARTBEAT_INTERVAL_MS = 20_000;
const PONG_TIMEOUT_MS = 8_000;
const RECONNECT_MAX_MS = 15_000;
const RECONNECT_BASE_MS = 500;

class WebSocketClient {
  private url: string;
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WsListener>> = new Map();
  private lifecycleListeners: Map<WsLifecycleEvent, Set<WsLifecycleListener>> = new Map();
  private outbox: string[] = [];
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  /** Marks whether the next `open` is a reconnect (vs. the initial connect). */
  private hasEverConnected = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (!this.url || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.setStatus(CONNECTION_STATUS.connecting);
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.publishReconnectAttempts(0);
      this.setStatus(CONNECTION_STATUS.open);
      this.startHeartbeat();

      const drained = this.outbox.splice(0);
      drained.forEach((frame) => this.socket?.send(frame));

      const isReconnect = this.hasEverConnected;
      this.hasEverConnected = true;
      this.emitLifecycle('open');
      if (isReconnect) this.emitLifecycle('reconnect');
    });

    this.socket.addEventListener('message', (event: MessageEvent<string>) => {
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch {
        useConnectionStore.getState().recordMalformed();
        if (typeof console !== 'undefined') console.warn('[ws] non-JSON frame dropped');
        return;
      }

      const parsed = parseServerFrame(raw);
      if (!parsed.ok) {
        useConnectionStore.getState().recordMalformed();
        if (typeof console !== 'undefined') {
          console.warn('[ws] invalid frame dropped', parsed.error.issues);
        }
        return;
      }

      useConnectionStore.getState().recordFrame();
      this.dispatch(parsed.frame.type, parsed.frame.payload);
    });

    this.socket.addEventListener('close', () => {
      this.stopHeartbeat();
      this.emitLifecycle('close');
      if (!this.shouldReconnect) {
        this.setStatus(CONNECTION_STATUS.closed);
        return;
      }
      this.setStatus(CONNECTION_STATUS.closed);
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** this.reconnectAttempts);
      this.reconnectAttempts += 1;
      this.publishReconnectAttempts(this.reconnectAttempts);
      setTimeout(() => this.connect(), delay);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.setStatus(CONNECTION_STATUS.closing);
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }

  send(type: WsEventName | string, payload?: WsPayload): void {
    const frame = JSON.stringify({ type, payload });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame);
    } else {
      this.outbox.push(frame);
    }
  }

  /**
   * Register a listener for a server-to-client event.
   *
   * The overload prefers `ServerToClientEvents` payloads when the event
   * name is a known constant, falling back to `unknown` for free-form
   * `string` keys so unrelated channels (e.g. ad-hoc debug events) stay
   * usable without widening the protocol.
   */
  on<E extends keyof ServerToClientEvents>(type: E, handler: WsTypedListener<E>): WsUnsubscribe;
  on<P = WsPayload>(type: string, handler: WsListener<P>): WsUnsubscribe;
  on(type: string, handler: WsListener): WsUnsubscribe {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  /**
   * Subscribe to a socket-lifecycle event. Useful for callers that need
   * to refresh server-authoritative state on `reconnect` (e.g. request a
   * fresh room snapshot) without coupling to the transport itself.
   */
  onLifecycle(event: WsLifecycleEvent, handler: WsLifecycleListener): WsUnsubscribe {
    if (!this.lifecycleListeners.has(event)) this.lifecycleListeners.set(event, new Set());
    this.lifecycleListeners.get(event)?.add(handler);
    return () => this.lifecycleListeners.get(event)?.delete(handler);
  }

  /**
   * Test/diagnostic hook for delivering an already-parsed pong outside
   * the regular `message` listener. Production callers go through
   * `parseServerFrame` \u2014 see `storeBridge.ts`.
   */
  notifyPong(echoedT: number): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    const rtt = Math.max(0, Date.now() - echoedT);
    useConnectionStore.getState().recordPong(rtt);
  }

  private dispatch(type: string, payload: WsPayload): void {
    this.listeners.get(type)?.forEach((handler) => handler(payload));
  }

  private emitLifecycle(event: WsLifecycleEvent): void {
    this.lifecycleListeners.get(event)?.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[ws] lifecycle handler threw', err);
      }
    });
  }

  private setStatus(status: (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS]): void {
    useConnectionStore.getState().setStatus(status);
  }

  private publishReconnectAttempts(n: number): void {
    useConnectionStore.getState().setReconnectAttempts(n);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendPing(), HEARTBEAT_INTERVAL_MS);
    // Send one immediately so RTT is measured early.
    this.sendPing();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.heartbeatTimer = null;
    this.pongTimer = null;
  }

  private sendPing(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    const t = Date.now();
    this.send(CLIENT_EVENTS.PING, { t });
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pongTimer = setTimeout(() => {
      // No pong in time \u2014 mark stale and forcibly close.
      useConnectionStore.getState().setStale(true);
      this.socket?.close();
    }, PONG_TIMEOUT_MS);
  }
}

const url: string = import.meta.env?.VITE_WS_URL ?? '';
export const wsClient = new WebSocketClient(url);

export { WS_EVENTS };
export type { WsEventName };
