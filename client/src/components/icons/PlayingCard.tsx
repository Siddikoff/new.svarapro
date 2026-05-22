import type { SuitKind } from './SuitShape';
import { SuitShape } from './SuitShape';

interface PlayingCardProps {
  cx: number;
  cy: number;
  w?: number;
  h?: number;
  rotate?: number;
  rank?: string;
  suit?: SuitKind;
  trim?: string;
}

export function PlayingCard({
  cx,
  cy,
  w = 60,
  h = 86,
  rotate = 0,
  rank = 'A',
  suit = 'spade',
  trim,
}: PlayingCardProps) {
  const L = suit === 'heart' || suit === 'diamond' ? '#cf2d44' : '#181818',
    x = cx - w / 2,
    R = cy - h / 2,
    B = trim || 'rgba(0,0,0,0.10)',
    X = `card-${Math.round(cx * 7 + cy * 13 + w * 23 + h * 31 + rotate * 41)}`,
    A = rank === 'J' || rank === 'Q' || rank === 'K';
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <defs>
        <linearGradient id={X} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef0f3" />
        </linearGradient>
      </defs>
      <rect
        x={x + 2}
        y={R + 4}
        width={w}
        height={h}
        rx={Math.max(6, w * 0.11)}
        fill="rgba(0,0,0,0.55)"
      />
      <rect
        x={x}
        y={R}
        width={w}
        height={h}
        rx={Math.max(6, w * 0.11)}
        fill={`url(#${X})`}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.7"
      />
      <rect
        x={x + 3}
        y={R + 3}
        width={w - 6}
        height={h - 6}
        rx={Math.max(4, w * 0.085)}
        fill="none"
        stroke={B}
        strokeWidth="0.7"
      />
      <text
        x={x + Math.max(5, w * 0.1)}
        y={R + Math.max(15, h * 0.2)}
        fontSize={Math.max(11, w * 0.22)}
        fontWeight="800"
        fill={L}
        fontFamily="Georgia,serif"
      >
        {rank}
      </text>
      <SuitShape
        kind={suit}
        x={x + Math.max(4, w * 0.08)}
        y={R + Math.max(17, h * 0.24)}
        size={Math.max(9, w * 0.18)}
        color={L}
      />
      {A ? (
        <g>
          <circle
            cx={cx}
            cy={cy - 4}
            r={Math.max(8, w * 0.18)}
            fill="none"
            stroke={L}
            strokeWidth="1.2"
            opacity="0.55"
          />
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            fontSize={Math.max(20, w * 0.4)}
            fontWeight="800"
            fill={L}
            fontFamily="Georgia,serif"
          >
            {rank}
          </text>
          <SuitShape
            kind={suit}
            x={cx - Math.max(6, w * 0.1)}
            y={cy + Math.max(8, h * 0.1)}
            size={Math.max(10, w * 0.18)}
            color={L}
          />
        </g>
      ) : (
        <SuitShape
          kind={suit}
          x={cx - Math.max(13, w * 0.27)}
          y={cy - Math.max(15, h * 0.22)}
          size={Math.max(22, w * 0.55)}
          color={L}
        />
      )}
      <g transform={`rotate(180 ${x + w - Math.max(5, w * 0.1)} ${R + h - Math.max(15, h * 0.2)})`}>
        <text
          x={x + w - Math.max(5, w * 0.1)}
          y={R + h - Math.max(15, h * 0.2)}
          fontSize={Math.max(11, w * 0.22)}
          fontWeight="800"
          fill={L}
          fontFamily="Georgia,serif"
        >
          {rank}
        </text>
        <SuitShape
          kind={suit}
          x={x + w - Math.max(6, w * 0.11)}
          y={R + h - Math.max(13, h * 0.18)}
          size={Math.max(9, w * 0.18)}
          color={L}
        />
      </g>
    </g>
  );
}
