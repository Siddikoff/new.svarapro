import { memo, useLayoutEffect, useRef } from 'react';

import {
  ANTE_CHIP_DURATION_MS,
  ANTE_CHIP_STAGGER_MS,
  type SeatAnchorPos,
} from '../constants';
import styles from './AnteOverlay.module.css';

// Inline SVG poker chip: 8 white edge notches + recessed darker centre.
// Body uses the same red as the playing-card backs so the chips visually pair
// with the cards on the table (matches `Cards.module.css` gradient endpoints
// #d8313f → #a01a26). Rendered as SVG so notches stay crisp at any size.
export function ChipFigure() {
  const cx = 20;
  const cy = 20;
  const r = 18;
  const innerR = r * 0.7;
  const wedges = [];
  for (let p = 0; p < 8; p++) {
    const half = 0.18;
    const mid = (p / 8) * Math.PI * 2 - Math.PI / 2;
    const a1 = mid - half;
    const a2 = mid + half;
    const xOut1 = cx + r * Math.cos(a1);
    const yOut1 = cy + r * Math.sin(a1);
    const xOut2 = cx + r * Math.cos(a2);
    const yOut2 = cy + r * Math.sin(a2);
    const xIn2 = cx + innerR * Math.cos(a2);
    const yIn2 = cy + innerR * Math.sin(a2);
    const xIn1 = cx + innerR * Math.cos(a1);
    const yIn1 = cy + innerR * Math.sin(a1);
    wedges.push(
      <path
        key={p}
        d={`M${xOut1} ${yOut1} A ${r} ${r} 0 0 1 ${xOut2} ${yOut2} L ${xIn2} ${yIn2} A ${innerR} ${innerR} 0 0 0 ${xIn1} ${yIn1} Z`}
        fill="#f5f5f5"
      />,
    );
  }
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="#d8313f" />
      <circle cx={cx - 2} cy={cy - 3} r={r * 0.55} fill="rgba(255,255,255,0.16)" />
      <circle cx={cx + 1} cy={cy + 3} r={r * 0.95} fill="rgba(160,26,38,0.45)" />
      {wedges}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#a01a26" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
    </svg>
  );
}

export interface AnteOverlaySeat {
  id?: string | number | null;
  empty?: boolean;
  pos: SeatAnchorPos;
}

export interface AnteOverlayProps {
  seats: AnteOverlaySeat[];
}

// Golden-angle jitter so chips land in a small pile under the pot instead of
// stacking on a single pixel. Coordinates are in container-% relative to the
// pile centre (50%, 58%).
export function pilePosition(idx: number): { topPct: number; leftPct: number } {
  const angle = ((idx * 137.508) % 360) * (Math.PI / 180);
  const r = 1.4 + idx * 0.45; // %
  return {
    leftPct: 50 + Math.cos(angle) * r,
    topPct: 58 + Math.sin(angle) * r * 0.55, // squashed vertically
  };
}

export interface ChipFlightAnimationOptions {
  chip: HTMLElement;
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  delayMs?: number;
}

export function startChipFlightAnimation({
  chip,
  startX,
  startY,
  destX,
  destY,
  delayMs = 0,
}: ChipFlightAnimationOptions): Animation {
  const dx = destX - startX;
  const dy = destY - startY;

  // Park the chip at the destination via top/left (the resting position
  // once the animation completes with fill: 'forwards'). The animation
  // then drives `transform: translate3d(...)` from `(start - dest)` back
  // to `(0, 0)` — purely on the compositor.
  chip.style.left = `${destX}px`;
  chip.style.top = `${destY}px`;

  // Slight upward bow at the mid-points keeps the toss from looking
  // like a flat slide; no rotation per user request.
  const liftMid1 = -18;
  const liftMid2 = -4;

  return chip.animate(
    [
      {
        opacity: 0,
        transform: `translate3d(${-dx}px, ${-dy}px, 0) scale(0.4)`,
      },
      {
        offset: 0.14,
        opacity: 1,
        transform: `translate3d(${-dx * 0.86}px, ${-dy * 0.86 + liftMid1}px, 0) scale(1.05)`,
      },
      {
        offset: 0.85,
        opacity: 1,
        transform: `translate3d(${-dx * 0.15}px, ${-dy * 0.15 + liftMid2}px, 0) scale(0.85)`,
      },
      {
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(0.8)',
      },
    ],
    {
      duration: ANTE_CHIP_DURATION_MS,
      easing: 'cubic-bezier(0.45, 0.05, 0.25, 1)',
      fill: 'forwards',
      delay: delayMs,
    },
  );
}

function AnteOverlayImpl({ seats }: AnteOverlayProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const occupied = seats.filter((s) => !s.empty && s.id != null);

  // Measure each seat's nameplate position relative to the overlay and run
  // a transform-only WAAPI animation per chip. This keeps the chip toss on
  // the compositor (no layout/paint per frame → stable 60+ fps) and lets us
  // anchor the start point to the actual rendered nameplate instead of the
  // seat-anchor coordinates, which were above the avatar.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const layerRect = layer.getBoundingClientRect();
    if (layerRect.width === 0 || layerRect.height === 0) return undefined;

    const animations: Animation[] = [];

    occupied.forEach((seat, i) => {
      const chip = chipRefs.current[i];
      if (!chip || seat.id == null) return;

      const np = document.querySelector(
        `[data-ante-anchor="${CSS.escape(String(seat.id))}"]`,
      ) as HTMLElement | null;
      if (!np) return;
      const npRect = np.getBoundingClientRect();

      const startX = npRect.left + npRect.width / 2 - layerRect.left;
      const startY = npRect.top + npRect.height / 2 - layerRect.top;

      const { topPct, leftPct } = pilePosition(i);
      const destX = (leftPct / 100) * layerRect.width;
      const destY = (topPct / 100) * layerRect.height;

      const anim = startChipFlightAnimation({
        chip,
        startX,
        startY,
        destX,
        destY,
        delayMs: i * ANTE_CHIP_STAGGER_MS,
      });
      animations.push(anim);
    });

    return () => {
      animations.forEach((a) => a.cancel());
    };
    // The overlay re-mounts under a new key for every round, so deps stay
    // empty — measurement runs exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // `data-table-chip-layer` lets the winner sweep find this layer and lift
    // its z-index above the cards so the existing chips fly *over* them when
    // they're swept to the winner.
    <div
      ref={layerRef}
      className={styles.layer}
      data-table-chip-layer="1"
      aria-hidden
    >
      {occupied.map((seat, i) => (
        <span
          key={String(seat.id)}
          ref={(el) => {
            chipRefs.current[i] = el;
          }}
          className={styles.chip}
          // `data-table-chip` marks every chip currently resting in the bank
          // pile so the winner sweep can collect them via DOM query and
          // animate the actual on-table chips (not a fresh duplicate set).
          data-table-chip="1"
        >
          <ChipFigure />
        </span>
      ))}
    </div>
  );
}

export const AnteOverlay = memo(AnteOverlayImpl);
