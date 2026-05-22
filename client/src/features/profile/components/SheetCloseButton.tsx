import { memo } from 'react';

import { hapticTap } from '../../../services/haptics';
import styles from './SheetCloseButton.module.css';

/**
 * Round "×" button anchored in the top-right of a bottom sheet.
 *
 * Kept as a thin presentational component so the partner and agreement
 * sheets share the same affordance.
 */
function SheetCloseButtonImpl({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Закрыть"
      onClick={() => {
        hapticTap();
        if (onClick) onClick();
      }}
      className={styles.btn}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    </button>
  );
}

export const SheetCloseButton = memo(SheetCloseButtonImpl);
