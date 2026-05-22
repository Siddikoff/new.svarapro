import { memo } from 'react';

import styles from '../DepositSheet.module.css';

function CopyToastImpl({ message }: { message: string }) {
  return <div className={styles.toast}>{message}</div>;
}

export const CopyToast = memo(CopyToastImpl);
