import { memo, useLayoutEffect, useRef } from 'react';

import { ANTE_CHIP_STAGGER_MS } from '../constants';
import {
  ChipFigure,
  pilePosition,
  startChipFlightAnimation,
} from './AnteOverlay';
import styles from './AnteOverlay.module.css';

export interface BetOverlayProps {
  seatId: string;
  chipCount: number;
  slotStart: number;
  slotModulo: number;
}

function BetOverlayImpl({ seatId, chipCount, slotStart, slotModulo }: BetOverlayProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const layerRect = layer.getBoundingClientRect();
    if (layerRect.width === 0 || layerRect.height === 0) return undefined;

    const anchor = document.querySelector(
      `[data-ante-anchor="${CSS.escape(seatId)}"]`,
    ) as HTMLElement | null;
    const potAnchor = document.querySelector('[data-pot-anchor]') as HTMLElement | null;
    if (!anchor || !potAnchor) return undefined;
    const anchorRect = anchor.getBoundingClientRect();
    const potRect = potAnchor.getBoundingClientRect();
    const startX = anchorRect.left + anchorRect.width / 2 - layerRect.left;
    const startY = anchorRect.top + anchorRect.height / 2 - layerRect.top;
    const pileCenterX = potRect.left + potRect.width / 2 - layerRect.left;
    const pileCenterY = potRect.top + potRect.height * 0.78 - layerRect.top;

    const animations: Animation[] = [];

    for (let i = 0; i < chipCount; i += 1) {
      const chip = chipRefs.current[i];
      if (!chip) continue;
      const { topPct, leftPct } = pilePosition((slotStart + i) % slotModulo);
      const spreadX = (leftPct - 50) * 1.9;
      const spreadY = (topPct - 58) * 1.6;
      const destX = pileCenterX + spreadX;
      const destY = pileCenterY + spreadY;
      animations.push(
        startChipFlightAnimation({
          chip,
          startX,
          startY,
          destX,
          destY,
          delayMs: i * ANTE_CHIP_STAGGER_MS,
        }),
      );
    }

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, [seatId, chipCount, slotStart, slotModulo]);

  return (
    // `data-table-chip-layer` / `data-table-chip` mark the live bank pile so
    // the winner sweep can collect these exact chips and fly them to the
    // winner instead of drawing a duplicate set.
    <div
      ref={layerRef}
      className={styles.layer}
      data-table-chip-layer="1"
      aria-hidden
    >
      {Array.from({ length: chipCount }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            chipRefs.current[i] = el;
          }}
          className={styles.chip}
          data-table-chip="1"
        >
          <ChipFigure />
        </span>
      ))}
    </div>
  );
}

export const BetOverlay = memo(BetOverlayImpl);
