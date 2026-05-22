import styles from './ErrorMsg.module.css';

export function ErrorMsg({ msg }: { msg?: string | null }) {
  return msg ? <div className={styles.errorMsg}>{msg}</div> : null;
}
