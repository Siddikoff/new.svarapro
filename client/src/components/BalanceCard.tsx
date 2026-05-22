import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { User } from '../types/domain';
import styles from './BalanceCard.module.css';

interface BalanceCardProps {
  user: User;
  onDeposit: () => void;
  onWithdraw: () => void;
}

function BalanceCardImpl({ user, onDeposit, onWithdraw }: BalanceCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const wholePart = Math.floor(user.balance);
  const decimalPart = (user.balance % 1).toFixed(2).slice(2);
  const showPhoto = !!user.photo && !imgError;
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.avatarColumn}>
          <div
            className={`${styles.avatar} ${showPhoto ? styles.avatarPhoto : styles.avatarPlaceholder}`}
          >
            {showPhoto ? (
              <img
                src={user.photo}
                alt={user.name}
                onError={() => setImgError(true)}
                className={styles.avatarImg}
              />
            ) : (
              user.avatar
            )}
          </div>
          <div className={styles.name}>{user.name}</div>
        </div>
        <div className={styles.balanceColumn}>
          <div className={styles.balanceLabel}>{t('balance_label')}</div>
          <div className={styles.balanceValue}>
            <span className={styles.balanceWhole}>
              {'$'}
              {wholePart}
            </span>
            <span className={styles.balanceFraction}>
              {'.'}
              {decimalPart}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button onClick={onDeposit} className={styles.actionBtn}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="5 12 12 19 19 12" />
          </svg>
          {t('balance_deposit')}
        </button>
        <button onClick={onWithdraw} className={styles.actionBtn}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
          {t('balance_withdraw')}
        </button>
      </div>
    </div>
  );
}

export const BalanceCard = memo(BalanceCardImpl);
