import type { ChangeEvent, CSSProperties } from 'react';
import { memo, useCallback } from 'react';

import { ErrorMsg } from '../../../components/ui/ErrorMsg';
import { InfoRows } from '../../../components/ui/InfoRows';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { QuickAmount } from '../../../components/ui/QuickAmount';
import { TextInput } from '../../../components/ui/TextInput';
import { COLORS } from '../../../designSystem';
import type { DepositMethod } from '../../../types/domain';
import { MethodHeader } from '../components/MethodHeader';
import styles from '../DepositSheet.module.css';

interface EnterAmountStepProps {
  method: DepositMethod;
  amountInput: string;
  errorMsg?: string | null;
  onChangeAmount: (value: string) => void;
  onBack: () => void;
  onAdvance: () => void;
}

function EnterAmountStepImpl({
  method,
  amountInput,
  errorMsg,
  onChangeAmount,
  onBack,
  onAdvance,
}: EnterAmountStepProps) {
  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onChangeAmount(e.target.value),
    [onChangeAmount],
  );
  const parsed = parseFloat(amountInput);
  const credited = amountInput && !Number.isNaN(parsed)
    ? parsed.toFixed(2) + ' USDT'
    : '—';

  return (
    <div>
      <MethodHeader method={method} onBack={onBack} variant="back" />
      <div className={styles.fieldLabel}>Сумма (USDT)</div>
      <QuickAmount value={amountInput} onChange={onChangeAmount} />
      <TextInput
        value={amountInput}
        onChange={handleInput}
        placeholder="Или введите сумму"
        type="tel"
        inputMode="decimal"
        style={{ marginBottom: 12 } as CSSProperties}
      />
      <InfoRows
        rows={[
          ['Курс', method.rate, ''] as const,
          ['Комиссия', method.hint, ''] as const,
          ['Зачислится', credited, COLORS.green] as const,
        ]}
      />
      <ErrorMsg msg={errorMsg} />
      <PrimaryButton onClick={onAdvance}>Продолжить</PrimaryButton>
    </div>
  );
}

export const EnterAmountStep = memo(EnterAmountStepImpl);
