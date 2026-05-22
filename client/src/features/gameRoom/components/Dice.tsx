import { memo } from 'react';

interface ChipProps {
  color?: string;
  size?: number;
}

function ChipImpl({ color = '#d8313f', size = 18 }: ChipProps) {
  const cx = 20;
  const cy = 20;
  const r = 18;
  const innerR = r * 0.72;
  const wedges = [];
  for (let p = 0; p < 8; p++) {
    const half = 0.16;
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
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id="chipShine" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.20" />
          <stop offset="60%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.30" />
        </radialGradient>
      </defs>
      <ellipse cx="20.5" cy="34" rx="16" ry="3" fill="rgba(0,0,0,0.45)" />
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill="url(#chipShine)" />
      {wedges}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="rgba(0,0,0,0.18)" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth="0.6" />
    </svg>
  );
}
export const Chip = memo(ChipImpl);

type DiePips = 1 | 2 | 3 | 4 | 5 | 6;

interface DieProps {
  pips: DiePips;
  x?: number;
  y?: number;
  rotate?: number;
  size?: number;
}

function Die({ pips, x = 0, y = 0, rotate = 0, size = 22 }: DieProps) {
  const dotPositions: Record<DiePips, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [
      [0.28, 0.28],
      [0.72, 0.72],
    ],
    3: [
      [0.25, 0.25],
      [0.5, 0.5],
      [0.75, 0.75],
    ],
    4: [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    5: [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.5, 0.5],
      [0.25, 0.75],
      [0.75, 0.75],
    ],
    6: [
      [0.28, 0.25],
      [0.72, 0.25],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.75],
      [0.72, 0.75],
    ],
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2})`}>
      <rect
        x="0"
        y="0"
        width={size}
        height={size}
        rx="4"
        ry="4"
        fill="#d8313f"
        stroke="#7a1722"
        strokeWidth="0.8"
      />
      <rect
        x="1"
        y="1"
        width={size - 2}
        height={size - 2}
        rx="3"
        ry="3"
        fill="url(#dieShine)"
        opacity="0.55"
      />
      {dotPositions[pips].map(([px, py], i: number) => (
        <circle key={i} cx={px * size} cy={py * size} r="2.2" fill="#ffffff" />
      ))}
    </g>
  );
}

function DiceTrioImpl() {
  return (
    <svg width="78" height="34" viewBox="0 0 78 34" aria-hidden>
      <defs>
        <linearGradient id="dieShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Die pips={5} x={3} y={5} rotate={-12} />
      <Die pips={3} x={27} y={6} rotate={5} />
      <Die pips={6} x={52} y={4} rotate={-3} />
    </svg>
  );
}
export const DiceTrio = memo(DiceTrioImpl);
