import { useState } from 'react';

import { SplashIllustration } from '../components/icons/SplashIllustration';
import { Countdown } from '../components/ui/Countdown';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Sheet } from '../components/ui/Sheet';
import { StatusBadge } from '../components/ui/StatusBadge';
import { COLORS } from '../designSystem';
import { hapticSuccess } from '../services/haptics';
import type { Tournament } from '../types/domain';
import { formatDateTime } from '../utils/format';
import styles from './TournamentGameScreen.module.css';

interface TournamentGameScreenProps {
  tournament: Tournament;
  joined: boolean;
  onRegister?: () => void;
}

export function TournamentGameScreen({
  tournament,
  joined,
  onRegister,
}: TournamentGameScreenProps) {
  const t = tournament;
  const isFull = t.players >= t.max;
  const isActive = t.status === 'active';
  const [showJoined, setShowJoined] = useState(false);
  const handleRegister = () => {
    onRegister?.();
    hapticSuccess();
    setShowJoined(true);
  };
  const rules = [
    {
      icon: '🏆',
      title: 'Формат турнира',
      body: 'После регистрации просто играйте обычные раунды Свары в любых столах. За каждую победу автоматически начисляются очки — это и есть ваш зачёт в турнире.',
    },
    {
      icon: '⭐',
      title: 'Начисление очков',
      body: 'Победа в раунде — 5 очков\nПобеда в свара-банке — 10 очков\nОчки складываются в общий зачёт за всё время турнира.',
    },
    {
      icon: '⏱',
      title: 'Расписание',
      body:
        'Старт: ' +
        formatDateTime(t.startAt) +
        `
Окончание: ` +
        formatDateTime(t.endAt) +
        `
Очки засчитываются только за раунды, сыгранные в окне турнира.`,
    },
    {
      icon: '💰',
      title: 'Взнос и призовой фонд',
      body:
        'Взнос $' +
        t.entry +
        ' списывается с баланса при регистрации. Все взносы участников формируют общий призовой фонд $' +
        t.prize.toLocaleString('en-US') +
        '.',
    },
    {
      icon: '⚠️',
      title: 'Дисквалификация',
      body: 'Использование сторонних программ или сговор между игроками ведёт к немедленной дисквалификации без возврата взноса.',
    },
  ];
  const prizes = [
    { place: '1 место', percent: 50, color: COLORS.gold, amount: Math.round(t.prize * 0.5) },
    { place: '2 место', percent: 30, color: '#b0b6c2', amount: Math.round(t.prize * 0.3) },
    { place: '3 место', percent: 20, color: '#c08054', amount: Math.round(t.prize * 0.2) },
  ];
  const steps = [
    'Нажмите «Участвовать» внизу экрана — со счёта спишется взнос $' + t.entry,
    'Дождитесь старта турнира',
    'Играйте обычные раунды Свары — очки за победы начисляются автоматически',
    'В конце турнира топ-3 по очкам забирают призовой фонд',
  ];
  return (
    <div className={styles.root}>
      <div className={styles.coverWrap}>
        <SplashIllustration kind={t.cover} />
        <div className={styles.coverFade} />
        <div className={styles.coverCaption}>
          <StatusBadge status={t.status} />
          <div className={styles.coverTitle}>{t.title}</div>
        </div>
      </div>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: COLORS.gold }}>
            {'$'}
            {t.prize.toLocaleString('en-US')}
          </div>
          <div className={styles.statLabel}>{'Призовой фонд'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {t.players}
            <span className={styles.statSlash}>
              {'/'}
              {t.max}
            </span>
          </div>
          <div className={styles.statLabel}>{'Участники'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: COLORS.green }}>
            {'$'}
            {t.entry}
          </div>
          <div className={styles.statLabel}>{'Взнос'}</div>
        </div>
      </div>
      <div className={styles.countdownRow}>
        <div className={styles.countdownLabel}>
          {isActive ? 'До конца турнира' : 'До старта турнира'}
        </div>
        <Countdown target={isActive ? t.endAt : t.startAt} />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{'Как участвовать'}</div>
        <div className={styles.stepsList}>
          {steps.map((stepText, idx) => (
            <div
              key={idx}
              className={`${styles.stepRow} ${idx === steps.length - 1 ? styles.last : ''}`}
            >
              <div className={styles.stepNumber}>{idx + 1}</div>
              <div className={styles.stepText}>{stepText}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{'Распределение призового фонда'}</div>
        <div className={styles.prizeBox}>
          {prizes.map((prize, idx) => (
            <div
              key={idx}
              className={`${styles.prizeRow} ${idx === prizes.length - 1 ? styles.last : ''}`}
            >
              <div className={styles.prizeHead}>
                <span className={styles.prizePlace}>{prize.place}</span>
                <span className={styles.prizeAmount} style={{ color: prize.color }}>
                  {'$'}
                  {prize.amount.toLocaleString('en-US')}{' '}
                  <span className={styles.prizePercent}>
                    {'('}
                    {prize.percent}
                    {'%)'}
                  </span>
                </span>
              </div>
              <div className={styles.prizeBarTrack}>
                <div
                  className={styles.prizeBarFill}
                  style={{
                    width: prize.percent + '%',
                    background: 'linear-gradient(90deg, ' + prize.color + '88, ' + prize.color + ')',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.sectionLast}>
        <div className={styles.sectionTitle}>{'Правила'}</div>
        <div className={styles.rulesList}>
          {rules.map((rule, idx) => (
            <div key={idx} className={styles.ruleCard}>
              <div className={styles.ruleHead}>
                <span className={styles.ruleIcon}>{rule.icon}</span>
                {rule.title}
              </div>
              <div className={styles.ruleBody}>{rule.body}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.ctaWrap}>
        {isFull && !joined ? (
          <PrimaryButton disabled>{'Мест нет'}</PrimaryButton>
        ) : joined ? (
          <PrimaryButton disabled color={COLORS.green}>
            {'✓ Вы участвуете'}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleRegister} color={COLORS.accent}>
            {'Участвовать · $'}
            {t.entry}
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
              {t.title}
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
