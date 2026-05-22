import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { COLORS } from '../../designSystem';
import styles from './LobbyFilterBar.module.css';

interface LobbyFilterBarProps {
  searchValue: string;
  onlyAvailable: boolean;
  activeFilterCount: number;
  onSearchChange: (value: string) => void;
  onToggleOnlyAvailable: () => void;
  onOpenFilters: () => void;
}

/**
 * Search + "only available" toggle + filter button. State lives in roomStore.
 */
function LobbyFilterBarImpl({
  searchValue,
  onlyAvailable,
  activeFilterCount,
  onSearchChange,
  onToggleOnlyAvailable,
  onOpenFilters,
}: LobbyFilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.searchWrap}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.hint}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.searchIcon}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
        </svg>
        <input
          className={'svr-search ' + styles.searchInput}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('search_room_placeholder')}
          inputMode="numeric"
        />
      </div>

      <span className={styles.toggleLabel}>{t('filter_only_available')}</span>

      <div
        onClick={onToggleOnlyAvailable}
        className={styles.toggle}
        style={{ background: onlyAvailable ? COLORS.accent : COLORS.toggleOff }}
      >
        <div className={styles.toggleKnob} style={{ left: onlyAvailable ? 18 : 2 }} />
      </div>

      <button
        onClick={onOpenFilters}
        className={styles.filterBtn}
        style={{ background: activeFilterCount ? COLORS.accent : COLORS.bg2 }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={activeFilterCount ? '#fff' : COLORS.text}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
      </button>
    </div>
  );
}

export const LobbyFilterBar = memo(LobbyFilterBarImpl);
