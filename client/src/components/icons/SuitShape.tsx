export type SuitKind = 'spade' | 'heart' | 'diamond' | 'club';

export interface SuitShapeProps {
  kind: SuitKind;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  opacity?: number;
}

export function SuitShape({ kind, x = 0, y = 0, size = 22, color, opacity = 1 }: SuitShapeProps) {
  const P = color || (kind === 'heart' || kind === 'diamond' ? '#d1344c' : '#1a1a1a'),
    _ = size / 24,
    L: Record<SuitKind, string> = {
      spade:
        'M12 2 L4 11 C2.5 13 2.5 16.5 5 18 C7.5 19.5 10 17.5 11 16 L10 21 H14 L13 16 C14 17.5 16.5 19.5 19 18 C21.5 16.5 21.5 13 20 11 L12 2 Z',
      heart:
        'M12 21 C12 21 3 14.5 3 8.5 C3 5.5 5.5 3 8.5 3 C10.4 3 12 4.2 12 6 C12 4.2 13.6 3 15.5 3 C18.5 3 21 5.5 21 8.5 C21 14.5 12 21 12 21 Z',
      diamond: 'M12 2 L21 12 L12 22 L3 12 Z',
      club: 'M12 2 C9.8 2 8 3.8 8 6 C8 6.6 8.2 7.2 8.4 7.7 C6.5 8.1 5 9.8 5 12 C5 14.2 6.8 16 9 16 C9.7 16 10.4 15.8 11 15.4 L10 21 H14 L13 15.4 C13.6 15.8 14.3 16 15 16 C17.2 16 19 14.2 19 12 C19 9.8 17.5 8.1 15.6 7.7 C15.8 7.2 16 6.6 16 6 C16 3.8 14.2 2 12 2 Z',
    };
  return (
    <g transform={`translate(${x} ${y}) scale(${_})`} opacity={opacity}>
      <path d={L[kind]} fill={P} />
    </g>
  );
}
