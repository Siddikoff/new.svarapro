import { memo } from 'react';

import { MethodBadge } from '../../../components/icons/MethodBadge';
import styles from '../DepositSheet.module.css';

export interface MethodHeaderMethod {
  id: string;
  label: string;
}

interface MethodHeaderProps {
  method: MethodHeaderMethod;
  onBack?: () => void;
  variant?: 'back' | 'centered';
  label?: string;
}

/**
 * Header used at the top of a deposit step.
 *
 * Two variants:
 *   - `variant="back"` (default): "Назад" pill + method label, used on the
 *     amount-entry step where we still allow the user to switch methods.
 *   - `variant="centered"`: just the method label, centered, used on the
 *     payment-detail steps where going back would be confusing.
 */
function MethodHeaderImpl({ method, onBack, variant = 'back', label }: MethodHeaderProps) {
  if (variant === 'centered') {
    return (
      <div className={styles.methodTitleCenter}>
        <MethodBadge id={method.id} s={22} />
        {label ?? method.label}
      </div>
    );
  }
  return (
    <div className={styles.methodHeader}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        Назад
      </button>
      <div className={styles.methodTitle}>
        <MethodBadge id={method.id} s={22} />
        {method.label}
      </div>
    </div>
  );
}

export const MethodHeader = memo(MethodHeaderImpl);
