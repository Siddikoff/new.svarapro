import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEAL_ORDER,
  DEAL_START_DELAY_MS,
  LAYOUT_DEAL_ORDER,
  LAYOUT_SEAT_MAP,
  ROUND_END_MS,
  SEAT_ROTATE_MS,
  type SeatAnchorPos,
  SEATS_DEFAULT,
} from '../constants';

export type { SeatAnchorPos };

export interface RotationSeat {
  id: number;
  pos: SeatAnchorPos;
  name?: string;
  stack?: string | number;
  /**
   * Either a numeric pravatar.cc seed (legacy stand-in avatars) or a full
   * URL string for real Telegram/CDN-hosted avatars. The Avatar component
   * detects URL strings and renders them directly.
   */
  photo?: number | string;
  dealer?: boolean;
  me?: boolean;
  empty?: boolean;
  timer?: number;
  /**
   * Server-authoritative Свара score (7..34). Set after the backend
   * computes it (look / showdown / svara resolution). The UI uses this
   * value directly so the joker (7♣) substitution rule never disagrees
   * with the backend.
   */
  score?: number;
  activeBet?: unknown;
  [key: string]: unknown;
}

/**
 * Overrides used to paint REAL player data over the positional placeholders
 * defined in `SEATS_DEFAULT`. Without these, the table would show nameless
 * stand-ins. `mySeat` is the locally authenticated user; `otherSeats` is
 * keyed by seat position (`'top'`, `'left-up'`, …) so the seat-rotation
 * machine can overlay each seat regardless of its current rotated id.
 */
export interface SeatOverlayData {
  name?: string;
  stack?: string | number;
  photo?: string | number;
  empty?: boolean;
  /** Server-authoritative Свара score forwarded from `realSeats`. */
  score?: number;
}

export interface UseSeatRotationOptions {
  room: { id?: string | number; max?: number; players?: number } | null | undefined;
  spectator: boolean;
  waitForNextRound: boolean;
  onTakeSeat?: (seat: RotationSeat | { pos: SeatAnchorPos } | null) => void;
  /** Real local-user profile painted onto the me-seat (bottom by default). */
  mySeat?: SeatOverlayData | null;
  /** Real other-player snapshots keyed by canonical position. */
  otherSeats?: Partial<Record<SeatAnchorPos, SeatOverlayData>>;
  /**
   * Server-driven dealing flag. When defined (true | false), it bypasses
   * the local `DEAL_START_DELAY_MS` setTimeout and drives `dealing` from
   * the wire (the svarapro NestJS gateway pushes `status === 'ante'` for
   * the deal phase, which the gameSocket bridge translates to
   * `phase === 'dealing'`).
   *
   * Leave `undefined` to keep the legacy local trigger — useful for tests,
   * mock/spectator decks, or any caller that hasn't wired the realtime
   * slice yet.
   */
  dealingFromServer?: boolean;
  /**
   * Realtime count of seated players (including the local user) from the
   * server snapshot. When provided, supersedes the stale `room.players`
   * field (which is set once on room entry and never updated) for the
   * `aloneInRoom` / `emptyPositionsBase` calculations. Without this, a
   * second player sitting down never decreased the empty-seat set on the
   * first player's view, so the first player saw the other player's seat
   * forced to `empty: true` even though `otherSeats` carried real data.
   *
   * `undefined` keeps the legacy room-based count (mock / unit tests).
   */
  serverSeatedCount?: number;
}

export interface UseSeatRotationResult {
  seats: RotationSeat[];
  getDisplayPos: (pos: SeatAnchorPos) => SeatAnchorPos;
  activeDealOrder: SeatAnchorPos[];
  joinedMidDeal: boolean;
  aloneInRoom: boolean;
  dealing: boolean;
  showDealing: boolean;
  handleTakeSeat: (seat: RotationSeat | null) => void;
}

/**
 * Models the "spectator picks a seat → seats slide → user is committed
 * to the chosen position" state machine.
 */
export function useSeatRotation({
  room,
  spectator,
  waitForNextRound,
  onTakeSeat,
  mySeat,
  otherSeats,
  dealingFromServer,
  serverSeatedCount,
}: UseSeatRotationOptions): UseSeatRotationResult {
  const [chosenPos, setChosenPos] = useState<SeatAnchorPos | null>(null);
  const [joinedMidDeal, setJoinedMidDeal] = useState<boolean>(false);
  const [dealing, setDealing] = useState<boolean>(false);
  const seatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (seatTimerRef.current != null) clearTimeout(seatTimerRef.current);
    },
    [],
  );

  // Prefer the realtime snapshot count when available — `room.players` is
  // a snapshot taken when the user clicked the lobby card and is never
  // refreshed for the in-room view (the `rooms` socket frame only updates
  // the lobby store). Without this preference, the first player stays
  // `aloneInRoom = true` forever (suppresses the deal animation) and
  // `emptyPositionsBase` keeps the other seats forced to empty, so the
  // second player's overlay never paints onto the felt.
  const seatedCount =
    typeof serverSeatedCount === 'number'
      ? serverSeatedCount
      : (room?.players ?? 6);

  const aloneInRoom = useMemo(
    () => seatedCount <= 1 && !spectator,
    [seatedCount, spectator],
  );

  const baseSeats = useMemo<RotationSeat[]>(() => {
    const defaults = SEATS_DEFAULT as RotationSeat[];
    const layoutMap = LAYOUT_SEAT_MAP as Record<number, Array<{ id: number; pos: SeatAnchorPos }>>;
    const maxSeats = Math.min(
      defaults.length,
      Math.max(2, typeof room?.max === 'number' ? room.max : defaults.length),
    );
    if (maxSeats >= defaults.length) return defaults;
    const layout = layoutMap[maxSeats];
    if (!layout) return defaults;
    return layout
      .map(({ id, pos }) => {
        const src = defaults.find((s) => s.id === id);
        return src ? { ...src, pos } : null;
      })
      .filter((s): s is RotationSeat => s !== null);
  }, [room?.max]);

  const rotationOrder = useMemo<SeatAnchorPos[]>(() => {
    const defaults = SEATS_DEFAULT as RotationSeat[];
    const maxSeats = baseSeats.length;
    if (maxSeats >= defaults.length) return DEAL_ORDER as SeatAnchorPos[];
    const order = (LAYOUT_DEAL_ORDER as Record<number, SeatAnchorPos[]>)[maxSeats];
    return order || (DEAL_ORDER as SeatAnchorPos[]);
  }, [baseSeats.length]);

  const rotationOffset = useMemo<number>(() => {
    if (!chosenPos || chosenPos === 'bottom' || joinedMidDeal) return 0;
    const n = rotationOrder.length;
    const bot = rotationOrder.indexOf('bottom');
    const cho = rotationOrder.indexOf(chosenPos);
    if (bot < 0 || cho < 0) return 0;
    return (bot - cho + n) % n;
  }, [chosenPos, joinedMidDeal, rotationOrder]);

  const getDisplayPos = useCallback(
    (pos: SeatAnchorPos): SeatAnchorPos => {
      const i = rotationOrder.indexOf(pos);
      if (i < 0) return pos;
      return rotationOrder[(i + rotationOffset) % rotationOrder.length];
    },
    [rotationOffset, rotationOrder],
  );

  const emptyPositionsBase = useMemo<Set<SeatAnchorPos>>(() => {
    const positions = baseSeats;
    // Server-driven mode: defer to `otherSeats` entirely for empty/occupied
    // determination (the loop below already handles `!overlay -> empty`).
    // Returning an empty set here avoids overriding the live overlay with
    // a stale count from the lobby snapshot.
    if (typeof serverSeatedCount === 'number') {
      return new Set<SeatAnchorPos>();
    }
    if (aloneInRoom) {
      return new Set(positions.filter((s) => !s.me).map((s) => s.pos));
    }
    // No `Math.max(1, …)` floor: when a room is genuinely empty (0 players)
    // we want every seat to render as empty rather than forcing the first
    // positional placeholder to look occupied.
    const filledCount = Math.min(
      positions.length,
      Math.max(0, typeof room?.players === 'number' ? room.players : positions.length),
    );
    const set = new Set<SeatAnchorPos>();
    let need = positions.length - filledCount;
    for (let i = positions.length - 1; i >= 0 && need > 0; i -= 1) {
      set.add(positions[i].pos);
      need -= 1;
    }
    return set;
  }, [room?.players, baseSeats, aloneInRoom, serverSeatedCount]);

  const seats = useMemo<RotationSeat[]>(() => {
    const myPos: SeatAnchorPos = chosenPos && chosenPos !== 'bottom' ? chosenPos : 'bottom';

    let working: RotationSeat[] = baseSeats.slice();

    if (myPos !== 'bottom') {
      const meIdx = working.findIndex((s) => s.me);
      const newIdx = working.findIndex((s) => s.pos === myPos);
      if (meIdx >= 0 && newIdx >= 0 && meIdx !== newIdx) {
        const meSeat = working[meIdx];
        const newSeat = working[newIdx];
        const { me: _me, timer, name, stack, photo, ...meRest } = meSeat;
        working = working.slice();
        working[meIdx] = { ...meRest, name, stack, photo };
        working[newIdx] = {
          id: newSeat.id,
          pos: newSeat.pos,
          name,
          stack,
          photo,
          me: true,
          ...(timer != null ? { timer } : {}),
        };
      }
    }

    if (spectator && !joinedMidDeal) {
      working = working.map((s) => {
        if (!s.me) return s;
        const { me: _me, timer: _timer, ...rest } = s;
        return rest as RotationSeat;
      });
    } else if (spectator && joinedMidDeal) {
      working = working.map((s) => {
        if (!s.me) return s;
        const { timer: _timer, ...rest } = s;
        return rest as RotationSeat;
      });
    }

    return working.map((s) => {
      if (s.me) {
        // Spectator with no committed seat hides the me-tag; otherwise paint
        // the local-user overlay onto the bottom (or chosen) seat.
        if (!mySeat) return s;
        return {
          ...s,
          ...(mySeat.name != null ? { name: mySeat.name } : {}),
          ...(mySeat.stack != null ? { stack: mySeat.stack } : {}),
          ...(mySeat.photo != null ? { photo: mySeat.photo } : {}),
          ...(mySeat.score != null ? { score: mySeat.score } : {}),
        };
      }
      if (emptyPositionsBase.has(s.pos) && s.pos !== chosenPos) {
        return { id: s.id, pos: s.pos, empty: true };
      }
      const overlay = otherSeats?.[s.pos];
      if (overlay?.empty) {
        return { id: s.id, pos: s.pos, empty: true };
      }
      if (otherSeats && !overlay) {
        // Caller opted into real-player overlays (passed `otherSeats`), but
        // no snapshot exists for this position — render the seat as empty
        // so the placeholder name/stack from `SEATS_DEFAULT` never leaks
        // onto the felt. When `otherSeats` is `undefined` we fall through
        // to the default-seat data (used by unit tests + mock mode).
        return { id: s.id, pos: s.pos, empty: true };
      }
      if (!overlay) return s;
      return {
        ...s,
        ...(overlay.name != null ? { name: overlay.name } : {}),
        ...(overlay.stack != null ? { stack: overlay.stack } : {}),
        ...(overlay.photo != null ? { photo: overlay.photo } : {}),
        ...(overlay.score != null ? { score: overlay.score } : {}),
      };
    });
  }, [spectator, chosenPos, joinedMidDeal, baseSeats, emptyPositionsBase, mySeat, otherSeats]);

  useEffect(() => {
    // Server-driven mode: phase === 'dealing' → dealing = true; anything
    // else → false. No local timer; the wire is the only source of truth.
    if (dealingFromServer !== undefined) {
      setDealing(dealingFromServer && !waitForNextRound && !aloneInRoom);
      return undefined;
    }
    if (waitForNextRound || aloneInRoom) {
      setDealing(false);
      return undefined;
    }
    const t = setTimeout(() => setDealing(true), DEAL_START_DELAY_MS);
    return () => clearTimeout(t);
  }, [dealingFromServer, waitForNextRound, aloneInRoom, room?.id]);

  const handleTakeSeat = useCallback(
    (seat: RotationSeat | null): void => {
      if (!seat || !spectator) {
        onTakeSeat?.(seat);
        return;
      }
      if (dealing) {
        setChosenPos(seat.pos);
        setJoinedMidDeal(true);
        return;
      }
      if (seat.pos === 'bottom') {
        onTakeSeat?.(seat);
        return;
      }
      setChosenPos(seat.pos);
      if (seatTimerRef.current != null) clearTimeout(seatTimerRef.current);
      seatTimerRef.current = setTimeout(() => {
        onTakeSeat?.(seat);
      }, SEAT_ROTATE_MS + 40);
    },
    [onTakeSeat, spectator, dealing],
  );

  useEffect(() => {
    if (!joinedMidDeal || !chosenPos) return undefined;
    const t = setTimeout(() => {
      if (chosenPos === 'bottom') {
        setJoinedMidDeal(false);
        onTakeSeat?.({ pos: 'bottom' });
        return;
      }
      setJoinedMidDeal(false);
      if (seatTimerRef.current != null) clearTimeout(seatTimerRef.current);
      seatTimerRef.current = setTimeout(() => {
        onTakeSeat?.({ pos: chosenPos });
      }, SEAT_ROTATE_MS + 40);
    }, ROUND_END_MS);
    return () => clearTimeout(t);
  }, [joinedMidDeal, chosenPos, onTakeSeat]);

  useEffect(() => {
    setChosenPos(null);
    setJoinedMidDeal(false);
  }, [room?.id]);

  const activeDealOrder = useMemo<SeatAnchorPos[]>(
    () =>
      rotationOrder.filter((pos) =>
        seats.some(
          (seat) =>
            !seat.empty && !(seat.me && joinedMidDeal) && getDisplayPos(seat.pos) === pos,
        ),
      ),
    [seats, getDisplayPos, joinedMidDeal, rotationOrder],
  );

  const showDealing = dealing && !waitForNextRound && (!chosenPos || joinedMidDeal);

  return {
    seats,
    getDisplayPos,
    activeDealOrder,
    joinedMidDeal,
    aloneInRoom,
    dealing,
    showDealing,
    handleTakeSeat,
  };
}
