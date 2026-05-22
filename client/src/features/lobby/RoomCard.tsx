import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { COLORS } from '../../designSystem';
import type { Room } from '../../types/domain';
import styles from './RoomCard.module.css';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
  onWatch: (room: Room) => void;
}

const LockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function RoomCardImpl({ room, onJoin, onWatch }: RoomCardProps) {
  const { t } = useTranslation();
  const isFull = room.players >= room.max;
  const hasPassword = Boolean(room.password);

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.headerCell}>{t('room_header')}</div>
        <div className={styles.headerCell}>{t('players_header')}</div>
        <div className={styles.headerCell}>{t('stake_header')}</div>
        <div className={styles.headerSpacer} />
      </div>
      <div className={styles.divider} />
      <div className={styles.bodyRow}>
        <div className={styles.bodyCell}>
          <span className={styles.numPrefix}>#</span>
          {room.num}
        </div>
        <div className={styles.bodyCell}>
          <span className={styles.playersCur}>{room.players}</span>
          <span className={styles.playersMax}>/{room.max}</span>
        </div>
        <div className={styles.bodyCell}>${room.bet}</div>
        <div className={styles.actionsCol}>
          <button
            disabled={isFull}
            onClick={() => onJoin(room)}
            className={styles.joinBtn}
            style={{
              background: isFull ? COLORS.div : COLORS.accent,
              color: isFull ? COLORS.hint : '#fff',
              cursor: isFull ? 'not-allowed' : 'pointer',
            }}
          >
            {hasPassword && !isFull && <LockIcon />}
            {isFull ? t('room_full') : t('room_enter')}
          </button>
          <button
            disabled={hasPassword}
            onClick={() => onWatch(room)}
            className={styles.watchBtn}
            style={{
              color: hasPassword ? COLORS.div : COLORS.hint,
              cursor: hasPassword ? 'not-allowed' : 'pointer',
            }}
          >
            {t('room_watch')}
          </button>
        </div>
      </div>
    </div>
  );
}

export const RoomCard = memo(RoomCardImpl);
