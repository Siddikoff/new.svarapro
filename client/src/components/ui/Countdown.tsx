import { useEffect, useState } from 'react';

import { pad2 } from '../../utils/format';
import styles from './Countdown.module.css';

export interface CountdownProps {
  target: Date;
}

interface SegmentProps {
  v: number;
  l: string;
}

export function Countdown({ target }: CountdownProps) {
  const [m, u] = useState(() => Date.now());
  useEffect(() => {
    const B = setInterval(() => u(Date.now()), 1e3);
    return () => clearInterval(B);
  }, []);
  const E = Math.max(0, Math.floor((target.getTime() - m) / 1e3)),
    S = Math.floor(E / 86400),
    k = Math.floor((E % 86400) / 3600),
    T = Math.floor((E % 3600) / 60),
    P = E % 60,
    Segment = ({ v: B, l: X }: SegmentProps) => (
      <div className={styles.segment}>
        <div className={styles.segmentValue}>{pad2(B)}</div>
        <div className={styles.segmentLabel}>{X}</div>
      </div>
    ),
    Separator = () => (
      <div className={styles.separator}>
        <div className={styles.separatorColon}>{':'}</div>
        <div className={styles.separatorSpacer} />
      </div>
    );
  return (
    <div className={styles.row}>
      <Segment v={S} l="д" />
      <Separator />
      <Segment v={k} l="ч" />
      <Separator />
      <Segment v={T} l="м" />
      <Separator />
      <Segment v={P} l="с" />
    </div>
  );
}
