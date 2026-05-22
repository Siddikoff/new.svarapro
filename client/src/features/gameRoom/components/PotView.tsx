import { memo } from 'react';

import styles from './PotView.module.css';

/* Center "Банк / Rake" pot readout + the waiting pill underneath.
 *
 * `waitingLabel` is null when no waiting state is active. When non-null
 * it renders the pulsing pill (`svrSeatWaitPulse`) — the keyframe is
 * defined in GameRoomKeyframes. */
export interface PotViewProps {
  amount: number;
  rakePercent: number;
  waitingLabel?: string | null;
}

function PotViewImpl({ amount, rakePercent, waitingLabel }: PotViewProps) {
  return (
    <div className={styles.root} data-pot-anchor>
      <div className={styles.amount}>{`Банк: $${amount}`}</div>
      <div className={styles.rake}>{`Rake ${rakePercent}%`}</div>
      {waitingLabel && <div className={styles.waitingPill}>{waitingLabel}</div>}
    </div>
  );
}

export const PotView = memo(PotViewImpl);
