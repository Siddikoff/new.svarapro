import { describe, expect, it } from 'vitest';

import { parseServerFrame,SERVER_EVENTS } from '..';

describe('parseServerFrame', () => {
  it('accepts a well-formed RoomState frame', () => {
    const result = parseServerFrame({
      type: SERVER_EVENTS.ROOM_STATE,
      payload: {
        version: 3,
        seats: {},
        pot: 100,
        phase: 'betting',
        activeSeatId: 1,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    if (result.frame.type !== SERVER_EVENTS.ROOM_STATE) throw new Error('wrong type');
    expect(result.frame.payload.version).toBe(3);
    expect(result.frame.payload.pot).toBe(100);
  });

  it('accepts a well-formed GameTick with version', () => {
    const result = parseServerFrame({
      type: SERVER_EVENTS.GAME_TICK,
      payload: { t: 1700, version: 3, pot: 150 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    if (result.frame.type !== SERVER_EVENTS.GAME_TICK) throw new Error('wrong type');
    expect(result.frame.payload.t).toBe(1700);
    expect(result.frame.payload.version).toBe(3);
  });

  it('accepts a Pong frame', () => {
    const result = parseServerFrame({
      type: SERVER_EVENTS.PONG,
      payload: { t: 12345 },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects an unknown event type', () => {
    const result = parseServerFrame({ type: 'totally:made:up', payload: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects a frame with the wrong payload shape', () => {
    const result = parseServerFrame({
      type: SERVER_EVENTS.GAME_TICK,
      payload: { t: 'not-a-number' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a frame missing payload', () => {
    const result = parseServerFrame({ type: SERVER_EVENTS.ROOM_STATE });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-object input', () => {
    expect(parseServerFrame(null).ok).toBe(false);
    expect(parseServerFrame('hello').ok).toBe(false);
    expect(parseServerFrame(42).ok).toBe(false);
  });
});
