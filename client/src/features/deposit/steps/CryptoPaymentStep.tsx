import { memo, useCallback, useState } from 'react';

import { DepositCountdown } from '../../../components/ui/DepositCountdown';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { hapticTap } from '../../../services/haptics';
import { CopyRow } from '../components/CopyRow';
import { CopyToast } from '../components/CopyToast';
import { MethodHeader } from '../components/MethodHeader';
import { WarningRow } from '../components/WarningRow';
import styles from '../DepositSheet.module.css';

export interface CryptoPaymentStepMethod {
  id: string;
  label: string;
  coin: string | null;
  netName: string | null;
  network: string | null;
}

function copyToClipboard(text: string) {
  try {
    navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard unavailable */
  }
}

export interface CryptoPaymentStepProps {
  method: CryptoPaymentStepMethod;
  amount: string;
  secondsLeft: number;
  /** Real deposit address from `POST /finances/transaction`. */
  address: string;
  /** Tracker id used by the backend / support to look up the deposit. */
  trackerId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SHORT_TRACKER = (value: string): string =>
  value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-8)}` : value;

function CryptoPaymentStepImpl({
  method,
  amount,
  secondsLeft,
  address,
  trackerId,
  onConfirm,
  onCancel,
}: CryptoPaymentStepProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTracker, setCopiedTracker] = useState(false);
  const amountFixed = parseFloat(amount).toFixed(2);
  const amountUnit = method.id === 'ton' ? 'TON' : 'USDT';

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(address);
    hapticTap();
    setCopiedAddress(true);
    const t = setTimeout(() => setCopiedAddress(false), 2000);
    return () => clearTimeout(t);
  }, [address]);

  const handleCopyTracker = useCallback(() => {
    copyToClipboard(trackerId);
    hapticTap();
    setCopiedTracker(true);
    const t = setTimeout(() => setCopiedTracker(false), 2000);
    return () => clearTimeout(t);
  }, [trackerId]);

  return (
    <div>
      <MethodHeader
        method={method}
        variant="centered"
        label={'Пополнение ' + method.label}
      />
      <WarningRow
        title={`Отправляйте только ${method.coin} в сети ${method.netName}`}
        sub="Использование другой сети может привести к утрате средств."
      />
      <div className={styles.fieldLabel}>Сумма к отправке</div>
      <div className={styles.amountRow}>
        <span className={styles.amountValue}>
          {amountFixed} {amountUnit}
        </span>
        <span className={styles.amountConvert}>≈ ${amountFixed}</span>
      </div>
      <div className={styles.fieldLabel}>{`Адрес для отправки (${method.network})`}</div>
      <CopyRow value={address} copied={copiedAddress} onCopy={handleCopyAddress} mono="address" />
      {trackerId && (
        <>
          <div className={styles.fieldLabel}>ID транзакции</div>
          <CopyRow
            value={SHORT_TRACKER(trackerId)}
            copied={copiedTracker}
            onCopy={handleCopyTracker}
            mono="address"
          />
        </>
      )}
      <DepositCountdown secondsLeft={secondsLeft} />
      {copiedAddress && <CopyToast message="✓ Адрес скопирован" />}
      {copiedTracker && <CopyToast message="✓ ID скопирован" />}
      <PrimaryButton onClick={onConfirm} disabled={secondsLeft <= 0}>
        Я отправил
      </PrimaryButton>
      <button type="button" onClick={onCancel} className={styles.cancelButton}>
        Отменить
      </button>
    </div>
  );
}

export const CryptoPaymentStep = memo(CryptoPaymentStepImpl);
