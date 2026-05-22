import { useTranslation } from 'react-i18next';

import styles from './ActiveRoomsHeader.module.css';

export function ActiveRoomsHeader({ onlineCount }: { onlineCount: number }) {
  const { t } = useTranslation();
  return (
    <div className={styles.row}>
      <div className={styles.title}>{t('active_rooms')}</div>
      <div className={styles.status}>
        <div className={`online-dot ${styles.dot}`} />
        <span className={styles.online}>{t('online_count', { count: onlineCount })}</span>
      </div>
    </div>
  );
}
