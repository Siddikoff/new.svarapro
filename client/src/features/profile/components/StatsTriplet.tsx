import type { CSSProperties } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { BRAND, COLORS } from '../../../designSystem';
import css from '../Profile.module.css';

interface StatsTripletProps {
  played: number;
  winRatePercent: number;
  earned: number;
}

type StatItem = readonly [value: string | number, label: string, color: string];

/**
 * 3-card row showing total games, win-rate and lifetime earnings.
 * Pure presentational — gets all data from the parent.
 */
function StatsTripletImpl({ played, winRatePercent, earned }: StatsTripletProps) {
  const { t } = useTranslation();
  const items: StatItem[] = [
    [played, t('games_played'), COLORS.gold],
    [winRatePercent + '%', t('win_rate'), COLORS.green],
    ['$' + earned, t('earnings'), BRAND.usdt],
  ];
  return (
    <div className={css.statsRow}>
      {items.map((item) => (
        <div key={item[1]} className={css.statCard}>
          <div className={css.statValue} style={{ color: item[2] } as CSSProperties}>
            {item[0]}
          </div>
          <div className={css.statLabel}>{item[1]}</div>
        </div>
      ))}
    </div>
  );
}

export const StatsTriplet = memo(StatsTripletImpl);
