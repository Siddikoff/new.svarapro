import { COLORS, RADIUS, SPACING } from '../../designSystem';

export interface QuickAmountProps {
  value: string;
  onChange: (value: string) => void;
}

export function QuickAmount({ value, onChange }: QuickAmountProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
      }}
    >
      {['10', '25', '50', '100'].map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: RADIUS.sm,
            border: '1.5px solid ' + (value === u ? COLORS.accent : COLORS.div),
            background: value === u ? COLORS.bg3 : COLORS.input,
            color: value === u ? COLORS.text : COLORS.hint,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          } as React.CSSProperties}
        >
          {u}
          {'$'}
        </button>
      ))}
    </div>
  );
}
