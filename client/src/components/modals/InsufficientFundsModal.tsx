import { COLORS } from '../../designSystem';
import { Sheet } from '../ui/Sheet';
import styles from './InsufficientFundsModal.module.css';

/**
 * Sheet shown when the user tries to join a room but their balance is below
 * the room's bet. Owns nothing — pure props.
 */
interface InsufficientFundsModalProps {
  balance: number;
  requiredBet: number;
  onDeposit: () => void;
  onClose: () => void;
}

export function InsufficientFundsModal({
  balance,
  requiredBet,
  onDeposit,
  onClose,
}: InsufficientFundsModalProps) {
  // GameRoom overlays the lobby at `z-index: 9999`, so the default
  // sheet z-index (200) would render this prompt *behind* the table
  // when a spectator tries to sit down without enough funds. Bump it
  // above the table so the warning is actually visible.
  return (
    <Sheet onClose={onClose} zIndex={10050}>
      <div className={styles.container}>
        <div className={styles.iconWrap}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke={COLORS.red}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className={styles.title}>Недостаточно средств</div>
        <div className={styles.message}>
          На балансе <b className={styles.strong}>${balance.toFixed(2)}</b>. Для входа в комнату
          нужно <b className={styles.strong}>${requiredBet}</b>. Пополните баланс, чтобы продолжить.
        </div>
        <button onClick={onDeposit} className={styles.primaryBtn}>
          Пополнить баланс
        </button>
        <button onClick={onClose} className={styles.ghostBtn}>
          Закрыть
        </button>
      </div>
    </Sheet>
  );
}
