import { MethodBadge } from '../icons/MethodBadge';
import styles from './ProcessingScreen.module.css';

export function ProcessingScreen({ id }: { id: string }) {
  return (
    <div className={styles.root}>
      <div className={styles.spinnerWrap}>
        <div className={styles.spinner} />
        <div className={styles.iconWrap}>
          <MethodBadge id={id} s={68} />
        </div>
      </div>
      <div className={styles.title}>{'Создаём адрес для пополнения…'}</div>
      <div className={styles.sub}>{'Это займёт пару секунд'}</div>
    </div>
  );
}
