import { memo } from 'react';

import styles from '../DepositSheet.module.css';

interface WarningRowProps {
  title: string;
  sub: string;
}

function WarningRowImpl({ title, sub }: WarningRowProps) {
  return (
    <div className={styles.warningRow}>
      <span className={styles.warningIcon} aria-hidden>⚠️</span>
      <div className={styles.warningBody}>
        <div className={styles.warningTitle}>{title}</div>
        <div className={styles.warningSub}>{sub}</div>
      </div>
    </div>
  );
}

export const WarningRow = memo(WarningRowImpl);
