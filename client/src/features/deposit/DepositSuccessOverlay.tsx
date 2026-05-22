import { memo, type MouseEvent } from 'react';

import { MethodBadge } from '../../components/icons/MethodBadge';
import styles from './DepositSuccessOverlay.module.css';

export interface DepositSuccessOverlayMethod {
  id?: string;
  label?: string;
}

export interface DepositSuccessOverlayProps {
  method?: DepositSuccessOverlayMethod | null;
  amount?: string;
  success: boolean;
  onClose: () => void;
}

/**
 * Step 5 overlay: spinner (waiting) → success card.
 *
 * Renders ABOVE the bottom sheet (own z-index) because the spinner is
 * fullscreen-centered, not anchored to the sheet bottom.
 */
function DepositSuccessOverlayImpl({ method, amount, success, onClose }: DepositSuccessOverlayProps) {
  const handleOverlayClick = success ? onClose : undefined;
  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      {success ? (
        <div className={styles.successCard} onClick={stop}>
          <div className={styles.successIconWrap}>
            <svg
              width={36}
              height={36}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.successCheck}
            >
              <polyline points="4 13 9 18 20 6" />
            </svg>
          </div>
          <div className={styles.successLabel}>ПЛАТЁЖ ПРОШЁЛ</div>
          <div className={styles.successAmount}>
            +${parseFloat(amount || '0').toFixed(2)}
          </div>
          <div className={styles.successHint}>Зачислено на ваш баланс</div>
          <button type="button" onClick={onClose} className={styles.successButton}>
            Понятно
          </button>
        </div>
      ) : (
        <div className={styles.spinnerCard} onClick={stop}>
          <div className={styles.spinnerRing}>
            <div className={styles.spinnerOuter} />
            <div className={styles.spinnerInner}>
              <MethodBadge id={method?.id ?? ''} s={30} />
            </div>
          </div>
          <div className={styles.spinnerTitle}>
            {method?.id === 'card' ? 'Проверяем перевод' : 'Проверяем транзакцию'}
          </div>
          <div className={styles.spinnerSub}>
            {method?.id === 'card'
              ? 'Это может занять несколько секунд'
              : 'Ищем ваш платёж в сети. Обычно занимает 1–3 минуты'}
          </div>
        </div>
      )}
    </div>
  );
}

export const DepositSuccessOverlay = memo(DepositSuccessOverlayImpl);
