import { useEffect, useState } from 'react';

import { fetchLeaderboard } from '../api/leaderboard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { COLORS } from '../designSystem';
import { useAuthStore } from '../store/authStore';
import type { LeaderboardEntry } from '../types/domain';
import styles from './RatingScreen.module.css';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_PLACE_LABELS = ['2nd', '1st', '3rd'];
const PODIUM_AVATAR_TONES = [
  styles.podiumAvatarSilver,
  styles.podiumAvatarGold,
  styles.podiumAvatarBronze,
] as const;
const PODIUM_BLOCK_TONES = [
  styles.podiumBlockSilver,
  styles.podiumBlockGold,
  styles.podiumBlockBronze,
] as const;

/**
 * Rating screen.
 *
 * Loads the leaderboard via `api/leaderboard.ts`. The backend has no
 * `/leaderboard` endpoint yet (see `api/leaderboard.ts` comments), so
 * the API layer still returns fixtures in dev / preview. In production
 * this screen is gated off via `VITE_FEATURE_RATING=0`, so the entire
 * tree below is unreachable until the real endpoint lands.
 */
export function RatingScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const currentUserName = useAuthStore((state) => state.user.name);

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboard().then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isMeRow = (name: string): boolean =>
    Boolean(currentUserName) && name === currentUserName;

  if (entries === null) {
    return (
      <div className={styles.root}>
        <SectionHeader
          title="Рейтинг"
          label="Лучшие игроки"
          accent={COLORS.gold}
          count={''}
          countLabel={''}
        />
      </div>
    );
  }

  if (entries.length < 3) {
    return (
      <div className={styles.root}>
        <SectionHeader
          title="Рейтинг"
          label="Лучшие игроки"
          accent={COLORS.gold}
          count={String(entries.length)}
          countLabel="игроков"
        />
        <div className={styles.body}>
          <div className={styles.listCard}>
            {entries.map((m: LeaderboardEntry, u: number) => {
              const isMe = isMeRow(m.name);
              const isLast = u === entries.length - 1;
              return (
                <div
                  key={m.pos}
                  className={`${styles.listRow} ${isLast ? styles.listRowLast : ''}`}
                >
                  <div className={styles.listRank}>{m.pos}</div>
                  <div className={`${styles.listAvatar} ${isMe ? styles.listAvatarMe : ''}`}>
                    {m.avatar}
                  </div>
                  <div className={styles.listInfo}>
                    <div className={`${styles.listName} ${isMe ? styles.listNameMe : ''}`}>
                      {m.name}
                      {isMe ? ' (you)' : ''}
                    </div>
                    <div className={styles.listMeta}>
                      {m.games}
                      {' games / '}
                      {m.wr}
                      {'% wins'}
                    </div>
                  </div>
                  <div className={styles.listEarn}>
                    {'$'}
                    {m.earned}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <SectionHeader
        title="Рейтинг"
        label="Лучшие игроки"
        accent={COLORS.gold}
        count={String(entries.length)}
        countLabel="игроков"
      />
      <div className={styles.body}>
        <div className={styles.podiumRow}>
          {[entries[1], entries[0], entries[2]].map(
            (m: LeaderboardEntry, u: number) => {
              const isMid = u === 1;
              const isMe = isMeRow(m.name);
              return (
                <div
                  key={m.pos}
                  className={`${styles.podiumCol} ${isMid ? styles.podiumColMid : styles.podiumColSide}`}
                >
                  <div className={styles.podiumEarn}>
                    {'$'}
                    {m.earned}
                  </div>
                  <div
                    className={`${styles.podiumAvatar} ${isMid ? styles.podiumAvatarMid : ''} ${isMe ? styles.podiumAvatarMe : styles.podiumAvatarOther} ${PODIUM_AVATAR_TONES[u]}`}
                  >
                    {m.avatar}
                  </div>
                  <div className={`${styles.podiumName} ${isMe ? styles.podiumNameMe : ''}`}>
                    {m.name.split(' ')[0]}
                  </div>
                  <div className={`${styles.podiumBlock} ${PODIUM_BLOCK_TONES[u]}`}>
                    <div className={isMid ? styles.podiumMedalMid : styles.podiumMedal}>
                      {PODIUM_MEDALS[m.pos - 1]}
                    </div>
                    <div className={styles.podiumLabel}>{PODIUM_PLACE_LABELS[u]}</div>
                  </div>
                </div>
              );
            },
          )}
        </div>
        <div className={styles.listCard}>
          {entries.map((m: LeaderboardEntry, u: number) => {
            const isMe = isMeRow(m.name);
            const isLast = u === entries.length - 1;
            return (
              <div
                key={m.pos}
                className={`${styles.listRow} ${isLast ? styles.listRowLast : ''}`}
              >
                <div
                  className={`${styles.listRank} ${m.pos <= 3 ? styles.listRankTop : ''}`}
                >
                  {m.pos <= 3 ? PODIUM_MEDALS[m.pos - 1] : m.pos}
                </div>
                <div className={`${styles.listAvatar} ${isMe ? styles.listAvatarMe : ''}`}>
                  {m.avatar}
                </div>
                <div className={styles.listInfo}>
                  <div className={`${styles.listName} ${isMe ? styles.listNameMe : ''}`}>
                    {m.name}
                    {isMe ? ' (you)' : ''}
                  </div>
                  <div className={styles.listMeta}>
                    {m.games}
                    {' games / '}
                    {m.wr}
                    {'% wins'}
                  </div>
                </div>
                <div className={styles.listEarn}>
                  {'$'}
                  {m.earned}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
