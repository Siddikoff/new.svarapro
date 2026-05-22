import { BRAND, RADIUS, SPACING } from '../../designSystem';

export function StatusBadge({ status }: { status: string }) {
  const m = status === 'active';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: SPACING.sm,
        background: m ? 'rgba(77,205,94,0.95)' : 'rgba(36,129,204,0.95)',
        color: BRAND.white,
        borderRadius: RADIUS.pill,
        padding: '5px 11px',
        fontSize: 12,
        fontWeight: 700,
      } as React.CSSProperties}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: BRAND.white,
          boxShadow: m ? '0 0 0 3px rgba(255,255,255,0.18)' : 'none',
        } as React.CSSProperties}
      />
      {m ? 'Активный' : 'Скоро'}
    </div>
  );
}
