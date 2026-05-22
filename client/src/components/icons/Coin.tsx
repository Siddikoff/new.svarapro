interface CoinProps {
  cx: number;
  cy: number;
  r?: number;
  rotate?: number;
  opacity?: number;
}

export function Coin({ cx, cy, r = 12, rotate = 0, opacity = 1 }: CoinProps) {
  const k = `coin-${Math.round(cx * 7 + cy * 11 + r * 19 + rotate * 5)}`;
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`} opacity={opacity}>
      <defs>
        <radialGradient id={k} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff5c0" />
          <stop offset="55%" stopColor="#f5cb47" />
          <stop offset="100%" stopColor="#a87a14" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy + r * 0.95} rx={r * 0.85} ry={r * 0.18} fill="rgba(0,0,0,0.4)" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${k})`}
        stroke="rgba(120,80,10,0.7)"
        strokeWidth="0.6"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r - 2.5}
        fill="none"
        stroke="rgba(255,240,180,0.6)"
        strokeWidth="0.6"
      />
      <text
        x={cx}
        y={cy + r * 0.32}
        textAnchor="middle"
        fontSize={r * 1.1}
        fontWeight="900"
        fill="#7a5410"
        fontFamily="Georgia,serif"
      >
        {'$'}
      </text>
    </g>
  );
}
