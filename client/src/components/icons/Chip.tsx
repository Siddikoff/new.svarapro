interface ChipProps {
  cx: number;
  cy: number;
  r?: number;
  color?: string;
}

export function Chip({ cx, cy, r = 22, color = '#b54043' }: ChipProps) {
  const k = `chip-${Math.round(cx * 13 + cy * 7 + r * 17)}`;
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
    <g>
      <defs>
        <radialGradient id={k} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.20" />
          <stop offset="60%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.30" />
        </radialGradient>
      </defs>
      <ellipse cx={cx + 1} cy={cy + r * 0.95} rx={r * 0.92} ry={r * 0.18} fill="rgba(0,0,0,0.45)" />
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${k})`} />
      {wedges}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="rgba(0,0,0,0.18)" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth="0.6" />
    </g>
  );
}
