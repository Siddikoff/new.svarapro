import { useState } from 'react';

import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Sheet } from '../components/ui/Sheet';
import { MOCK_TOURNAMENT_LEADERBOARD, MOCK_USER } from '../data/mocks';
import { COLORS } from '../designSystem';
import { hapticSuccess } from '../services/haptics';
import type { Tournament, TournamentLeaderboardEntry } from '../types/domain';
import styles from './TournamentDetailsScreen.module.css';

interface TournamentDetailsScreenProps {
  tournament: Tournament;
  joined: boolean;
  onRegister?: () => void;
}

const PODIUM_LABELS = ['2nd', '1st', '3rd'];
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_AVATAR_TONES = [
  styles.podiumAvatarSilver,
  styles.podiumAvatarGold,
  styles.podiumAvatarBronze,
] as const;
const PODIUM_BAR_TONES = [
  styles.podiumBarSilver,
  styles.podiumBarGold,
  styles.podiumBarBronze,
] as const;

export function TournamentDetailsScreen({
  tournament,
  joined,
  onRegister,
}: TournamentDetailsScreenProps) {
  const [tab, setTab] = useState('table');
  const [showJoined, setShowJoined] = useState(false);
  const handleRegister = () => {
    onRegister?.();
    hapticSuccess();
    setShowJoined(true);
  };
  return (
    <div className={styles.root}>
      <div
        className={`${styles.hero} ${tournament.status === 'active' ? styles.active : styles.upcoming}`}
      >
        <div className={styles.heroBlob} />
        <div className={styles.heroTitle}>{tournament.title}</div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue} style={{ color: COLORS.gold }}>
              {'$'}
              {tournament.prize.toLocaleString()}
            </div>
            <div className={styles.heroStatLabel}>{'Призовой фонд'}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>
              {tournament.players}
              <span className={styles.heroStatSlash}>
                {'/'}
                {tournament.max}
              </span>
            </div>
            <div className={styles.heroStatLabel}>{'Участники'}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue} style={{ color: COLORS.green }}>
              {'$'}
              {tournament.entry}
            </div>
            <div className={styles.heroStatLabel}>{'Взнос'}</div>
          </div>
        </div>
      </div>
      <div className={styles.tabsBar}>
        {[
          ['table', 'Таблица'],
          ['rules', 'Правила'],
        ].map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {tab === 'table' && (
        <div className={styles.tablePane}>
          <div className={styles.podiumRow}>
            {[
              MOCK_TOURNAMENT_LEADERBOARD[1],
              MOCK_TOURNAMENT_LEADERBOARD[0],
              MOCK_TOURNAMENT_LEADERBOARD[2],
            ].map((row: TournamentLeaderboardEntry, idx: number) => {
              const isCenter = idx === 1;
              const isMe = row.name === MOCK_USER.name;
              return (
                <div
                  key={row.pos}
                  className={`${styles.podiumCol} ${isCenter ? styles.podiumColMid : styles.podiumColSide}`}
                >
                  <div className={styles.podiumPoints}>
                    {row.points}
                    {' pts'}
                  </div>
                  <div
                    className={`${styles.podiumAvatar} ${isCenter ? styles.podiumAvatarMid : ''} ${isMe ? styles.podiumAvatarMe : styles.podiumAvatarOther} ${PODIUM_AVATAR_TONES[idx]}`}
                  >
                    {row.avatar}
                  </div>
                  <div className={`${styles.podiumName} ${isMe ? styles.podiumNameMe : ''}`}>
                    {row.name.split(' ')[0]}
                  </div>
                  <div className={`${styles.podiumBar} ${PODIUM_BAR_TONES[idx]}`}>
                    <div className={isCenter ? styles.podiumMedalMid : styles.podiumMedal}>
                      {PODIUM_MEDALS[row.pos - 1]}
                    </div>
                    <div className={styles.podiumPlace}>{PODIUM_LABELS[idx]}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.leaderboard}>
            <div className={styles.leaderboardHeader}>
              <div className={`${styles.leaderboardHeaderCell} ${styles.leaderboardHeaderRank}`}>
                {'#'}
              </div>
              <div className={`${styles.leaderboardHeaderCell} ${styles.leaderboardHeaderName}`}>
                {'Игрок'}
              </div>
              <div className={`${styles.leaderboardHeaderCell} ${styles.leaderboardHeaderWins}`}>
                {'Победы'}
              </div>
              <div className={`${styles.leaderboardHeaderCell} ${styles.leaderboardHeaderPoints}`}>
                {'Очки'}
              </div>
              <div className={`${styles.leaderboardHeaderCell} ${styles.leaderboardHeaderPrize}`}>
                {'Приз'}
              </div>
            </div>
            {MOCK_TOURNAMENT_LEADERBOARD.map((row: TournamentLeaderboardEntry, idx: number) => {
              const isMe = row.name === MOCK_USER.name;
              const isLast = idx === MOCK_TOURNAMENT_LEADERBOARD.length - 1;
              return (
                <div
                  key={row.pos}
                  className={`${styles.leaderboardRow} ${isLast ? styles.last : ''} ${isMe ? styles.me : ''}`}
                >
                  <div
                    className={`${styles.rowRank} ${row.pos <= 3 ? styles.rowRankTop : ''}`}
                  >
                    {row.pos <= 3 ? PODIUM_MEDALS[row.pos - 1] : row.pos}
                  </div>
                  <div className={styles.rowNameCell}>
                    <div className={`${styles.rowAvatar} ${isMe ? styles.rowAvatarMe : ''}`}>
                      {row.avatar}
                    </div>
                    <div className={`${styles.rowName} ${isMe ? styles.rowNameMe : ''}`}>
                      {row.name}
                      {isMe ? ' (вы)' : ''}
                    </div>
                  </div>
                  <div className={styles.rowWins}>{row.wins}</div>
                  <div className={styles.rowPoints}>{row.points}</div>
                  <div
                    className={`${styles.rowPrize} ${row.prize > 0 ? styles.rowPrizeAwarded : ''}`}
                  >
                    {row.prize > 0 ? '$' + row.prize : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'rules' && (
        <div className={styles.rulesPane}>
          {[
            {
              title: 'Формат турнира',
              text: 'После регистрации просто играйте обычные раунды Свары в любых столах. За каждую победу автоматически начисляются очки — это и есть ваш зачёт в турнире.',
            },
            {
              title: 'Начисление очков',
              text: `Победа в раунде — 5 очков
Победа в свара-банке — 10 очков
Очки складываются за всё время турнира.`,
            },
            {
              title: 'Окно турнира',
              text: 'Очки засчитываются только за раунды, сыгранные между стартом и окончанием турнира. Игры до и после в зачёт не идут.',
            },
            {
              title: 'Взнос',
              text: 'Взнос за участие списывается при регистрации. Все взносы участников формируют общий призовой фонд турнира.',
            },
            {
              title: 'Призовые места',
              text: `1 место — 50% призового фонда
2 место — 30% призового фонда
3 место — 20% призового фонда
Места определяются по сумме очков на момент окончания турнира.`,
            },
            {
              title: 'Дисквалификация',
              text: 'Использование сторонних программ или сговор между игроками ведёт к немедленной дисквалификации без возврата взноса.',
            },
          ].map((rule, idx) => (
            <div key={idx} className={styles.ruleCard}>
              <div className={styles.ruleTitle}>{rule.title}</div>
              <div className={styles.ruleText}>{rule.text}</div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.ctaWrap}>
        {tournament.players >= tournament.max && !joined ? (
          <PrimaryButton disabled>{'Мест нет'}</PrimaryButton>
        ) : joined ? (
          <PrimaryButton disabled color={COLORS.green}>
            {'✓ Вы участвуете'}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleRegister} color={COLORS.accent}>
            {'Участвовать · $'}
            {tournament.entry}
          </PrimaryButton>
        )}
      </div>
      {showJoined && (
        <Sheet onClose={() => setShowJoined(false)}>
          <div className={styles.successBody}>
            <div className={styles.successBadge}>
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
                <polyline points="4 12 10 18 20 7" className={styles.successCheckPath} />
              </svg>
            </div>
            <div className={styles.successTitle}>{'Поздравляем!'}</div>
            <div className={styles.successHint}>{'Вы участвуете в турнире'}</div>
            <div className={styles.successName}>
              {'«'}
              {tournament.title}
              {'»'}
            </div>
            <PrimaryButton onClick={() => setShowJoined(false)} color={COLORS.accent}>
              {'OK'}
            </PrimaryButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
