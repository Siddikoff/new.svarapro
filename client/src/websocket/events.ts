/**
 * Stable, string-typed catalogue of WebSocket event names.
 *
 * Single source of truth lives in `src/shared/protocol`. This module
 * is a thin re-export so the previous import path (`websocket/events`)
 * stays valid for callers that haven't been migrated yet.
 */
export { WS_EVENTS, type WsEventName } from '../shared/protocol';
