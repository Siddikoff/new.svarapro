import { useCallback, useEffect, useRef, useState } from 'react';

import { hapticTap } from '../../../services/haptics';
import styles from './RaiseSheet.module.css';

interface RaisePreset {
  key: string;
  label: string;
  factor?: number;
}

// Bottom-sheet for the raise action. Covers the whole game-room column via
// `inset: 0`, intercepting taps on the felt/bar. The custom slider mirrors
// the lobby filter slider — rectangular drag handle with two grip lines,
// thin track, accent fill. A haptic tick fires on every integer change
// (drag or preset).

// Multiplier presets relative to currentBet. The "Макс" key uses maxRaise.
const PRESETS: RaisePreset[] = [
  { key: 'x2', label: '2×', factor: 2 },
  { key: 'x3', label: '3×', factor: 3 },
  { key: 'x4', label: '4×', factor: 4 },
  { key: 'max', label: 'Макс' },
];

interface SingleSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
}

// Single-thumb slider mirroring the lobby filter handle: 28×26 rectangle
// with two vertical grip bars. Drag is pointer-event based so we can
// haptic-tick on integer-step changes only.
function SingleSlider({ min, max, value, onChange }: SingleSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastValueRef = useRef(value);
  const draggingRef = useRef(false);

  const updateFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const next = Math.round(min + ratio * (max - min));
      if (next === lastValueRef.current) return;
      lastValueRef.current = next;
      onChange(next);
    },
    [min, max, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    lastValueRef.current = value;
    updateFromX(e.clientX);

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
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove as (event: Event) => void, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div onPointerDown={onPointerDown} className={styles.sliderWrap}>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.trackFill} style={{ width: `${percent}%` }} />
        <div className={styles.thumb} style={{ left: `${percent}%` }}>
          <div className={styles.thumbGrip} />
          <div className={styles.thumbGrip} />
        </div>
      </div>
    </div>
  );
}

function presetAmount(preset: RaisePreset, currentBet: number, minRaise: number, maxRaise: number): number {
  if (preset.key === 'max') return maxRaise;
  const raw = currentBet * (preset.factor ?? 1);
  return Math.max(minRaise, Math.min(maxRaise, raw));
}

export interface RaiseSheetProps {
  open: boolean;
  currentBet?: number;
  minRaise?: number;
  maxRaise?: number;
  onClose?: () => void;
  onConfirm?: (value: number) => void;
}

export function RaiseSheet({
  open,
  currentBet = 10,
  minRaise = 20,
  maxRaise = 200,
  onClose,
  onConfirm,
}: RaiseSheetProps) {
  const [value, setValue] = useState(minRaise);
  const lastTickRef = useRef(minRaise);

  // Reset to minimum every time the sheet opens.
  useEffect(() => {
    if (open) {
      setValue(minRaise);
      lastTickRef.current = minRaise;
    }
  }, [open, minRaise]);

  const updateValue = useCallback(
    (next: number) => {
      const clamped = Math.max(minRaise, Math.min(maxRaise, next));
      setValue(clamped);
      if (clamped !== lastTickRef.current) {
        hapticTap();
        lastTickRef.current = clamped;
      }
    },
    [minRaise, maxRaise],
  );

  if (!open) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={styles.sheet} role="dialog" aria-label="Повысить ставку">
        <div className={styles.head}>
          <span className={styles.headTitle}>Повысить</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className={styles.headClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.amount}>${value}</div>
        <div className={styles.sub}>текущая ставка ${currentBet}</div>

        <SingleSlider min={minRaise} max={maxRaise} value={value} onChange={updateValue} />

        <div className={styles.bounds}>
          <span>мин ${minRaise}</span>
          <span>макс ${maxRaise}</span>
        </div>

        <div className={styles.chipsRow}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => updateValue(presetAmount(p, currentBet, minRaise, maxRaise))}
              className={styles.chip}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.ctaRow}>
          <button type="button" onClick={onClose} className={styles.ctaCancel}>
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              hapticTap();
              onConfirm?.(value);
            }}
            className={styles.ctaConfirm}
          >
            Повысить ${value}
          </button>
        </div>
      </div>
    </>
  );
}
