import { Sheet } from '../components/ui/Sheet';
import { COLORS } from '../designSystem';
import styles from './StartGameSheet.module.css';

interface StartGameSheetProps {
  onClose: () => void;
  onCreate: () => void;
  onJoin: () => void;
}

export function StartGameSheet({ onClose, onCreate, onJoin }: StartGameSheetProps) {
  return (
    <Sheet onClose={onClose}>
      <div className={styles.title}>{'Начать игру'}</div>
      <div className={styles.sub}>{'Создайте комнату или войдите по коду'}</div>
      <div
        onClick={onCreate}
        className={styles.optionRow + ' ' + styles.optionRowSpaced}
      >
        <div className={styles.iconBox + ' ' + styles.iconBoxBlue}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className={styles.optionInfo}>
          <div className={styles.optionTitle}>{'Создать комнату'}</div>
          <div className={styles.optionSub}>{'Настройте ставку и пригласите друзей'}</div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.hint}
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <div onClick={onJoin} className={styles.optionRow}>
        <div className={styles.iconBox + ' ' + styles.iconBoxGreen}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className={styles.optionInfo}>
          <div className={styles.optionTitle}>{'Войти по коду'}</div>
          <div className={styles.optionSub}>{'Введите код комнаты от друга'}</div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.hint}
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Sheet>
  );
}
