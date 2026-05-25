import type { CSSProperties } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { BRAND, COLORS } from '../../../designSystem';
import css from '../Profile.module.css';

interface StatsTripletProps {
  /** `null` renders a placeholder dash; `0` renders a real zero. */
  played: number | null;
  /** `null` renders a placeholder dash; `0` renders `0%`. */
  winRatePercent: number | null;
  /** `null` renders a placeholder dash; `0` renders `$0`. */
  earned: number | null;
}

type StatItem = readonly [value: string | number, label: string, color: string];

const PLACEHOLDER = '—';

/**
 * 3-card row showing total games, win-rate and lifetime earnings.
 *
 * Each metric accepts `null` to mean "value not available yet" — the
 * card then shows a placeholder dash instead of `0` / `0%` / `$0`. This
 * matters because the svarapro backend doesn't yet expose per-user
 * aggregate stats; until it does, parents pass `null` so we don't lie
 * to the user about how many games they've played.
 */
function StatsTripletImpl({ played, winRatePercent, earned }: StatsTripletProps) {
  const { t } = useTranslation();
  const items: StatItem[] = [
    [played ?? PLACEHOLDER, t('games_played'), COLORS.gold],
    [winRatePercent !== null ? winRatePercent + '%' : PLACEHOLDER, t('win_rate'), COLORS.green],
    [earned !== null ? '$' + earned : PLACEHOLDER, t('earnings'), BRAND.usdt],
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
