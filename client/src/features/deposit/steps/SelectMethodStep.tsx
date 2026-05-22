import { memo } from 'react';

import { MethodList } from '../../../components/ui/MethodList';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { DEPOSIT_METHODS } from '../../../data/mocks';
import styles from '../DepositSheet.module.css';

interface SelectMethodStepProps {
  methodId: string | null;
  onSelectMethod: (id: string) => void;
  onAdvance: () => void;
}

function SelectMethodStepImpl({
  methodId,
  onSelectMethod,
  onAdvance,
}: SelectMethodStepProps) {
  return (
    <div>
      <div className={styles.stepTitle}>Пополнить баланс</div>
      <div className={styles.stepSubtitle}>Выберите способ оплаты</div>
      <MethodList methods={DEPOSIT_METHODS} sel={methodId} onSel={onSelectMethod} />
      <PrimaryButton onClick={() => methodId && onAdvance()} disabled={!methodId}>
        Далее
      </PrimaryButton>
    </div>
  );
}

export const SelectMethodStep = memo(SelectMethodStepImpl);
