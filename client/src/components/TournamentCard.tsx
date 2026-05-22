import { memo, useCallback, useState } from 'react';

import { COLORS } from '../designSystem';
import { hapticSuccess } from '../services/haptics';
import type { Tournament } from '../types/domain';
import { formatDateTime } from '../utils/format';
import { SplashIllustration } from './icons/SplashIllustration';
import styles from './TournamentCard.module.css';
import { Countdown } from './ui/Countdown';
import { PrimaryButton } from './ui/PrimaryButton';
import { Sheet } from './ui/Sheet';
import { StatusBadge } from './ui/StatusBadge';

interface TournamentCardProps {
  t: Tournament;
  onDetails?: (tournament: Tournament) => void;
  onJoin?: (tournament: Tournament) => void;
  joined?: boolean;
  onRegister?: (tournamentId: number) => void;
}

function TournamentCardImpl({
  t: tournament,
  onDetails,
  onJoin,
  joined,
  onRegister,
}: TournamentCardProps) {
  const dateRange = `${formatDateTime(tournament.startAt)} — ${formatDateTime(tournament.endAt)}`;
  const isFull = tournament.players >= tournament.max;
  const [isSuccessSheetOpen, setIsSuccessSheetOpen] = useState(false);

  const handleRegister = useCallback(() => {
    onRegister?.(tournament.id);
    hapticSuccess();
    setIsSuccessSheetOpen(true);
  }, [onRegister, tournament.id]);

  return (
    <div className={styles.root}>
      <div className={styles.coverWrap}>
        <SplashIllustration kind={tournament.cover} />
        <div className={styles.coverOverlay}>
          <div className={styles.coverKicker}>{'Призовой фонд'}</div>
          <div className={styles.coverPrize}>
            {'$'}
            {tournament.prize.toLocaleString('en-US')}
          </div>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.title}>{tournament.title}</div>
        <div className={styles.badgeWrap}>
          <StatusBadge status={tournament.status} />
        </div>
        <div className={styles.dateRange}>{dateRange}</div>
        <div className={styles.divider} />
        <div className={styles.countRow}>
          <div className={styles.countLabel}>
            {tournament.status === 'active' ? 'До конца турнира' : 'До старта турнира'}
          </div>
          <Countdown
            target={tournament.status === 'active' ? tournament.endAt : tournament.startAt}
          />
        </div>
        {joined ? (
          <div
            className={styles.joinedRow}
            onClick={onJoin ? () => onJoin(tournament) : undefined}
            style={{ cursor: onJoin ? 'pointer' : 'default' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={COLORS.green} stroke="none">
              <circle cx="12" cy="12" r="10" fill={COLORS.green} />
              <polyline
                points="7 12.5 10.5 16 17 9"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {'Вы уже участвуете'}
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isFull) handleRegister();
            }}
            disabled={isFull}
            className={styles.actionBtn}
            style={{
              cursor: isFull ? 'default' : 'pointer',
              background: isFull ? COLORS.div : COLORS.accent,
              color: isFull ? COLORS.hint : '#fff',
            }}
          >
            {isFull ? 'Мест нет' : 'Участвовать · $' + tournament.entry}
          </button>
        )}
        <button onClick={() => onDetails?.(tournament)} className={styles.detailsBtn}>
          {'Подробнее'}
        </button>
      </div>
      {isSuccessSheetOpen && (
        <Sheet onClose={() => setIsSuccessSheetOpen(false)}>
          <div className={styles.successWrap}>
            <div className={styles.successCircle}>
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 12 10 18 20 7" className={styles.successCheck} />
              </svg>
            </div>
            <div className={styles.successTitle}>{'Поздравляем!'}</div>
            <div className={styles.successHint}>{'Вы участвуете в турнире'}</div>
            <div className={styles.successName}>
              {'«'}
              {tournament.title}
              {'»'}
            </div>
            <PrimaryButton onClick={() => setIsSuccessSheetOpen(false)} color={COLORS.accent}>
              {'OK'}
            </PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export const TournamentCard = memo(TournamentCardImpl);
