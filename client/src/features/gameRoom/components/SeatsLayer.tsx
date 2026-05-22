import { memo } from 'react';

import type { SeatAnchorPos } from '../constants';
import type { Card } from '../deck';
import type { RotationSeat } from '../hooks/useSeatRotation';
import { Seat, type SeatData, type SeatReaction } from './Seat';

export type SeatsLayerSeat = RotationSeat;

export interface SeatsLayerProps {
  seats: SeatsLayerSeat[];
  getDisplayPos: (pos: SeatAnchorPos) => SeatAnchorPos;
  reactions: Record<string | number, SeatReaction | null | undefined>;
  dealing?: boolean;
  spectator?: boolean;
  onInvite?: () => void;
  onTakeSeat?: (seat: SeatsLayerSeat) => void;
  activeDealOrder: SeatAnchorPos[];
  hideInviteArrow?: boolean;
  isJoinedMidDeal?: boolean;
  // Hand for the me-seat only — shown while the local player keeps their
  // own cards open (Открыть → PostOpenButtons). Falls back to `seatHands`
  // when a showdown is active.
  myHand?: Card[];
  // Hands keyed by seat.id, populated during a showdown so every seat
  // (including me) flips face-up simultaneously.
  seatHands?: Record<string, Card[]>;
  // String-keyed set of seat ids that are part of the current Svara tie.
  // Each tied seat's score chip / hand-score badge swaps to a gold pulse.
  svaraSeatIds?: ReadonlySet<string>;
  /** Seat id (string) of the player whose turn it is. */
  activeTurnSeatId?: string | null;
  /** 0-1 turn timer progress for the active seat. */
  turnTimerProgress?: number | null;
  /** True when the me-seat auto-folded (time expired). Hides dealt cards. */
  myAutoFolded?: boolean;
  /** Seat id (string) of the round winner. */
  winnerSeatId?: string | null;
  /** Formatted win amount string shown on the winner badge. */
  winnerAmount?: string | null;
}

/* Wraps the seat-list render so the heavy memoization is concentrated in
 * one place. The parent owns the rotation/seat-state machine and passes
 * already-resolved seat objects + a `getDisplayPos` mapper. */
function SeatsLayerImpl({
  seats,
  getDisplayPos,
  reactions,
  dealing,
  spectator,
  onInvite,
  onTakeSeat,
  activeDealOrder,
  hideInviteArrow,
  isJoinedMidDeal,
  myHand,
  seatHands,
  svaraSeatIds,
  activeTurnSeatId,
  turnTimerProgress,
  myAutoFolded,
  winnerSeatId,
  winnerAmount,
}: SeatsLayerProps) {
  // The `Seat` component is typed against the canonical `SeatData` shape so
  // it can be reused without coupling to the rotation hook. SeatsLayer carries
  // the richer `SeatsLayerSeat` (= `RotationSeat`) and casts the callback so
  // callers can keep their richer type without re-validating it inside `Seat`.
  const handleSeatTake = onTakeSeat
    ? (seat: SeatData) => onTakeSeat(seat as SeatsLayerSeat)
    : undefined;
  return (
    <>
      {seats.map((seat) => {
        // Showdown hand (every seat) wins over the local-only `myHand` so
        // the final flip animation renders consistently for all players.
        const seatKey = seat.id == null ? '' : String(seat.id);
        const showdownHand = seatHands?.[seatKey];
        const hand = showdownHand ?? (seat.me ? myHand : undefined);
        const isSvara = !!(seatKey && svaraSeatIds?.has(seatKey));
        return (
          <Seat
            key={seat.id}
            seat={seat}
            displayPos={getDisplayPos(seat.pos)}
            animateMove
            reaction={reactions[seat.id] ?? null}
            dealing={dealing}
            onInvite={onInvite}
            spectator={spectator}
            onTakeSeat={handleSeatTake}
            activeDealOrder={activeDealOrder}
            hideInviteArrow={hideInviteArrow}
            dim={!!(seat.me && (isJoinedMidDeal || myAutoFolded))}
            hand={hand}
            svara={isSvara}
            timerProgress={
              seatKey && activeTurnSeatId === seatKey
                ? turnTimerProgress
                : null
            }
            hideCards={!!(seat.me && myAutoFolded)}
            winner={!!(seatKey && winnerSeatId === seatKey)}
            winnerAmount={seatKey && winnerSeatId === seatKey ? winnerAmount : null}
          />
        );
      })}
    </>
  );
}

export const SeatsLayer = memo(SeatsLayerImpl);
