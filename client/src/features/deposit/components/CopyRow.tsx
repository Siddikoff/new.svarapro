import { memo } from 'react';

import styles from '../DepositSheet.module.css';

/**
 * Row with a copyable value (address / card number / sum) and a Copy button.
 *
 * Props:
 *   - value: the string shown.
 *   - copied: bool — when true, the button flips to success state.
 *   - onCopy: () => void
 *   - mono: 'address' | 'card' — chooses the monospace variant.
 */
interface CopyRowProps {
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: 'address' | 'card';
}

function CopyRowImpl({ value, copied, onCopy, mono = 'address' }: CopyRowProps) {
  const valueClass = mono === 'card' ? styles.copyValueCard : styles.copyValueMono;
  return (
    <div className={styles.copyRow}>
      <span className={valueClass}>{value}</span>
      <button
        type="button"
        onClick={onCopy}
        className={`${styles.copyButton} ${copied ? styles.copyButtonActive : ''}`}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

export const CopyRow = memo(CopyRowImpl);
