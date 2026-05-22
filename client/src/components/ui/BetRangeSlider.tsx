import { useCallback, useEffect, useRef } from 'react';

import { BET_LABELS, BET_LADDER } from '../../constants/bets';
import { COLORS } from '../../designSystem';
import { hapticTap } from '../../services/haptics';
import styles from './BetRangeSlider.module.css';

/**
 * Double-thumb slider over BET_LADDER positions.
 *
 * Refs are used (instead of state) for the live drag values so we don't
 * re-render on every pointermove event — only when the index actually changes
 * do we call onMin/onMax which lifts the new value to the parent.
 */
type RangeSide = 'min' | 'max';

export interface BetRangeSliderProps {
  minIdx: number;
  maxIdx: number;
  onMin: (idx: number) => void;
  onMax: (idx: number) => void;
}

export function BetRangeSlider({ minIdx, maxIdx, onMin, onMax }: BetRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  // 'min' | 'max' | null — which handle is being dragged right now.
  const activeHandleRef = useRef<RangeSide | null>(null);
  // The last index value we reported to the parent for the active handle —
  // used to throttle haptic feedback to one tap per step.
  const lastIndexRef = useRef<number | null>(null);
  // Mirror props in refs so the pointermove listener captured at drag-start
  // always sees the latest prop values without rebinding.
  const minIdxPropRef = useRef(minIdx);
  const maxIdxPropRef = useRef(maxIdx);

  useEffect(() => {
    minIdxPropRef.current = minIdx;
  }, [minIdx]);
  useEffect(() => {
    maxIdxPropRef.current = maxIdx;
  }, [maxIdx]);

  const ladderLength = BET_LADDER.length;

  // Given a client X coordinate, snap to the nearest ladder index and lift it.
  const updateFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const nextIndex = Math.round(ratio * (ladderLength - 1));
      if (nextIndex === lastIndexRef.current) return;
      const side = activeHandleRef.current;
      if (side === 'min' && nextIndex <= maxIdxPropRef.current) {
        onMin(nextIndex);
        lastIndexRef.current = nextIndex;
        hapticTap();
      } else if (side === 'max' && nextIndex >= minIdxPropRef.current) {
        onMax(nextIndex);
        lastIndexRef.current = nextIndex;
        hapticTap();
      }
    },
    [onMin, onMax, ladderLength],
  );

  const startDrag = (side: RangeSide) => (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandleRef.current) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    activeHandleRef.current = side;
    lastIndexRef.current = side === 'min' ? minIdxPropRef.current : maxIdxPropRef.current;
    hapticTap();

    const onMove = (moveEvent: PointerEvent | TouchEvent | MouseEvent) => {
      const clientX = (moveEvent as PointerEvent | MouseEvent).clientX;
      const touches = (moveEvent as TouchEvent).touches;
      const x =
        typeof clientX === 'number'
          ? clientX
          : touches && touches[0]
            ? touches[0].clientX
            : 0;
      updateFromX(x);
    };
    const stop = () => {
      activeHandleRef.current = null;
      lastIndexRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove as (event: Event) => void, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const indexToPercent = (idx: number) => (idx / (ladderLength - 1)) * 100;

  const Handle = ({ side }: { side: RangeSide }) => (
    <div
      onPointerDown={startDrag(side)}
      className={styles.handle}
      style={{ left: indexToPercent(side === 'min' ? minIdx : maxIdx) + '%' }}
    >
      <div className={styles.handleStripe} />
      <div className={styles.handleStripe} />
    </div>
  );

  return (
    <div className={styles.root}>
      <div className={styles.labelRow}>
        {BET_LABELS.map((label: string, idx: number) => (
          <span
            key={idx}
            className={styles.label}
            style={{
              left: indexToPercent(idx) + '%',
              color: idx >= minIdx && idx <= maxIdx ? COLORS.text : COLORS.hint,
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <div ref={trackRef} className={styles.track}>
        <div
          className={styles.fill}
          style={{
            left: indexToPercent(minIdx) + '%',
            right: 100 - indexToPercent(maxIdx) + '%',
          }}
        />
        {BET_LADDER.map((_value, idx: number) => {
          if (idx === 0 || idx === ladderLength - 1) return null;
          const inRange = idx >= minIdx && idx <= maxIdx;
          return (
            <div
              key={idx}
              className={styles.tick}
              style={{
                left: indexToPercent(idx) + '%',
                background: inRange ? COLORS.accent : COLORS.div,
              }}
            />
          );
        })}
        <Handle side="min" />
        <Handle side="max" />
      </div>
    </div>
  );
}
