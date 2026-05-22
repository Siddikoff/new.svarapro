import { CardIcon } from './CardIcon';
import { TonIcon } from './TonIcon';
import { UsdtIcon } from './UsdtIcon';

export function MethodIcon({ method, s = 28 }: { method: string; s?: number }) {
  return method === 'TON' ? (
    <TonIcon s={s} />
  ) : method === 'USDT' ? (
    <UsdtIcon s={s} />
  ) : (
    <CardIcon s={s} />
  );
}
