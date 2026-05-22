interface CardBackProps {
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  rotate?: number;
  color?: string;
  accent?: string;
}

export function CardBack({
  cx,
  cy,
  w = 50,
  h = 72,
  rotate = 0,
  color = '#1a4f8a',
  accent = '#caa258',
}: CardBackProps) {
  const P = cx - w / 2,
    _ = cy - h / 2,
    L = `back-${Math.round(cx * 7 + cy * 13 + w * 23 + h * 31 + rotate * 41)}`;
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <defs>
        <linearGradient id={L} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.78" />
        </linearGradient>
        <pattern id={`${L}-pat`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M4 0 L8 4 L4 8 L0 4 Z"
            fill="none"
            stroke={accent}
            strokeOpacity="0.45"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect
        x={P + 2}
        y={_ + 4}
        width={w}
        height={h}
        rx={Math.max(6, w * 0.11)}
        fill="rgba(0,0,0,0.5)"
      />
      <rect
        x={P}
        y={_}
        width={w}
        height={h}
        rx={Math.max(6, w * 0.11)}
        fill={`url(#${L})`}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.6"
      />
      <rect
        x={P + 3}
        y={_ + 3}
        width={w - 6}
        height={h - 6}
        rx={Math.max(4, w * 0.085)}
        fill="none"
        stroke={accent}
        strokeWidth="0.8"
        opacity="0.85"
      />
      <rect x={P + 6} y={_ + 6} width={w - 12} height={h - 12} fill={`url(#${L}-pat)`} />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.18} fill={accent} opacity="0.85" />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.13} fill={color} />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={Math.min(w, h) * 0.18}
        fontWeight="800"
        fill={accent}
        fontFamily="Georgia,serif"
      >
        {'S'}
      </text>
    </g>
  );
}
