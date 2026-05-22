import { TonIcon } from './TonIcon';
import { UsdtIcon } from './UsdtIcon';

export function MethodBadge({ id, s }: { id: string; s: number }) {
  return id === 'ton' ? (
    <TonIcon s={s} />
  ) : id === 'usdt' ? (
    <UsdtIcon s={s} />
  ) : (
    <span
      style={{
        fontSize: s * 0.8,
      } as React.CSSProperties}
    >
      {'💳'}
    </span>
  );
}
