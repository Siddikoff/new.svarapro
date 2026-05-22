import { BetRangeSlider } from '../../components/ui/BetRangeSlider';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Sheet } from '../../components/ui/Sheet';
import { BET_LABELS } from '../../constants/bets';
import { COLORS } from '../../designSystem';
import type { RoomFilters, SeatCountFilter } from '../../store/roomStore';
import styles from './LobbyFilterSheet.module.css';

const SEAT_COUNT_OPTIONS: ReadonlyArray<{ value: SeatCountFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 4, label: '4 игрока' },
  { value: 6, label: '6 игроков' },
];

export interface LobbyFilterSheetProps {
  filters: RoomFilters;
  activeFilterCount: number;
  filteredCount: number;
  onClose: () => void;
  onChangeFilter: <K extends keyof RoomFilters>(key: K, value: RoomFilters[K]) => void;
  onReset: () => void;
}

/**
 * Filter bottom-sheet for the lobby. State lives in roomStore.
 */
export function LobbyFilterSheet({
  filters,
  activeFilterCount,
  filteredCount,
  onClose,
  onChangeFilter,
  onReset,
}: LobbyFilterSheetProps) {
  return (
    <Sheet onClose={onClose}>
      <div className={styles.headerRow}>
        <div className={styles.title}>Фильтр</div>
        {activeFilterCount > 0 && (
          <button onClick={onReset} className={styles.resetBtn}>
            Сбросить
          </button>
        )}
      </div>

      <div className={styles.rangeRow}>
        <span className={styles.sectionLabel}>Ставка</span>
        <span className={styles.rangeValue}>
          ${BET_LABELS[filters.betMinIndex]} — ${BET_LABELS[filters.betMaxIndex]}
        </span>
      </div>
      <div className={styles.sliderWrap}>
        <BetRangeSlider
          minIdx={filters.betMinIndex}
          maxIdx={filters.betMaxIndex}
          onMin={(value) => onChangeFilter('betMinIndex', value)}
          onMax={(value) => onChangeFilter('betMaxIndex', value)}
        />
      </div>

      <div className={`${styles.sectionLabel} ${styles.seatRowLabel}`}>Кол-во мест</div>
      <div className={styles.seatRow}>
        {SEAT_COUNT_OPTIONS.map((option) => {
          const isActive = filters.seatCount === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChangeFilter('seatCount', option.value)}
              className={styles.seatBtn}
              style={{
                border: `1.5px solid ${isActive ? COLORS.accent : COLORS.div}`,
                background: isActive ? COLORS.accent : COLORS.input,
                color: isActive ? '#fff' : COLORS.text,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <PrimaryButton onClick={onClose}>Показать комнаты ({filteredCount})</PrimaryButton>
      </div>
    </Sheet>
  );
}
