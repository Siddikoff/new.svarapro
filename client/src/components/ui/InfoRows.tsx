
import { COLORS, RADIUS, SPACING } from '../../designSystem';

type InfoRow = readonly [label: string, value: string, color?: string];

export function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <div
      style={{
        background: COLORS.input,
        borderRadius: RADIUS.md,
        padding: '12px 14px',
        marginBottom: SPACING.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
      } as React.CSSProperties}
    >
      {rows.map((m, u) => (
        <div
          key={`${m[0]}-${u}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            color: COLORS.hint,
          } as React.CSSProperties}
        >
          <span>{m[0]}</span>
          <span
            style={{
              color: m[2] || COLORS.text,
            } as React.CSSProperties}
          >
            {m[1]}
          </span>
        </div>
      ))}
    </div>
  );
}
