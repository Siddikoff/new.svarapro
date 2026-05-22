import { memo, useCallback, useState } from 'react';

import { DepositCountdown } from '../../../components/ui/DepositCountdown';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { hapticTap } from '../../../services/haptics';
import { CopyRow } from '../components/CopyRow';
import { CopyToast } from '../components/CopyToast';
import { MethodHeader } from '../components/MethodHeader';
import { WarningRow } from '../components/WarningRow';
import styles from '../DepositSheet.module.css';

// TODO(backend): the card credentials are returned per-deposit-request from
// the server; strip these mocks once `paymentsApi.createDeposit('card')` is
// live.
const MOCK_CARD = {
  number: '8600 1234 5678 9012',
  holder: 'ALEKSANDR SIDDIKOV',
};

function copyToClipboard(text: string) {
  try {
    navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard unavailable */
  }
}

export interface CardPaymentStepMethod {
  id: string;
  label: string;
  color?: string;
}

export interface CardPaymentStepProps {
  method: CardPaymentStepMethod;
  amount: string;
  secondsLeft: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function CardPaymentStepImpl({
  method,
  amount,
  secondsLeft,
  onConfirm,
  onCancel,
}: CardPaymentStepProps) {
  const [cardCopied, setCardCopied] = useState(false);
  const [sumCopied, setSumCopied] = useState(false);

  const amountStr = '$' + parseFloat(amount || '0').toFixed(2);

  const handleCopyAmount = useCallback(() => {
    copyToClipboard(amountStr);
    hapticTap();
    setSumCopied(true);
    const t = setTimeout(() => setSumCopied(false), 2000);
    return () => clearTimeout(t);
  }, [amountStr]);

  const handleCopyCard = useCallback(() => {
    copyToClipboard(MOCK_CARD.number);
    hapticTap();
    setCardCopied(true);
    const t = setTimeout(() => setCardCopied(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleConfirm = useCallback(() => {
    hapticTap();
    onConfirm();
  }, [onConfirm]);

  return (
    <div>
      <MethodHeader method={method} variant="centered" label="Оплата картой" />
      <WarningRow
        title="Переведите точную сумму одним платежом"
        sub="Повторные или частичные переводы не зачисляются автоматически — обратитесь в поддержку."
      />
      <div className={styles.fieldLabel}>Сумма к переводу</div>
      <div className={`${styles.amountRow}`} style={{ gap: 10 }}>
        <span className={styles.amountValueLarge}>{amountStr}</span>
        <button
          type="button"
          onClick={handleCopyAmount}
          className={`${styles.copyButton} ${sumCopied ? styles.copyButtonActive : ''}`}
        >
          {sumCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className={styles.fieldLabel}>Номер карты</div>
      <CopyRow
        value={MOCK_CARD.number}
        copied={cardCopied}
        onCopy={handleCopyCard}
        mono="card"
      />
      <div className={styles.fieldLabel}>Получатель</div>
      <div className={styles.recipient}>{MOCK_CARD.holder}</div>
      <DepositCountdown secondsLeft={secondsLeft} label="Реквизиты действуют" />
      {(cardCopied || sumCopied) && (
        <CopyToast
          message={cardCopied ? '✓ Номер карты скопирован' : '✓ Сумма скопирована'}
        />
      )}
      <PrimaryButton onClick={handleConfirm} disabled={secondsLeft <= 0}>
        Я оплатил
      </PrimaryButton>
      <button type="button" onClick={onCancel} className={styles.cancelButton}>
        Отменить
      </button>
    </div>
  );
}

export const CardPaymentStep = memo(CardPaymentStepImpl);
