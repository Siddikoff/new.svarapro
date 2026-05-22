
import { COLORS, RADIUS } from '../../designSystem';
interface DepositCountdownProps {
  secondsLeft: number;
  label?: string;
}

export function DepositCountdown({ secondsLeft, label = 'Адрес действует' }: DepositCountdownProps) {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0'),
    u = String(secondsLeft % 60).padStart(2, '0'),
    E = secondsLeft <= 0;
  return (
    <div
      style={{
        background: E ? 'rgba(224,92,92,0.1)' : COLORS.input,
        border: '1px solid ' + (E ? COLORS.red + '55' : COLORS.div),
        borderRadius: RADIUS.md,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      } as React.CSSProperties}
    >
      <span
        style={{
          fontSize: 13,
          color: COLORS.hint,
        } as React.CSSProperties}
      >
        {E ? 'Время вышло' : label}
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: E ? COLORS.red : COLORS.text,
          fontVariantNumeric: 'tabular-nums',
        } as React.CSSProperties}
      >
        {m}
        {':'}
        {u}
      </span>
    </div>
  );
}
