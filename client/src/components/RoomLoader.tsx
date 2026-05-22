import { useEffect } from 'react';

import { requestTelegramFullscreen } from '../services/telegram';
import type { Room } from '../types/domain';
import styles from './RoomLoader.module.css';

const CARDS = [
  { suit: '\u2665', color: '#e54848', anim: 'svrCardDeal0', delay: '0s', bobDelay: '0s', z: 1 },
  { suit: '\u2660', color: '#1a2533', anim: 'svrCardDeal1', delay: '.22s', bobDelay: '.4s', z: 3 },
  { suit: '\u2666', color: '#e54848', anim: 'svrCardDeal2', delay: '.44s', bobDelay: '.8s', z: 2 },
];

/* Same pattern as SplashScreen / GameRoomKeyframes — the 3-card deal +
 * bob keyframes are referenced from inline-styled markup via literal
 * names. CSS Modules locally-scopes `@keyframes`, so keeping them in
 * `RoomLoader.module.css` produced a renamed keyframe that no element
 * actually referenced, and the cards never appeared (only the "Entering
 * room…" text was visible). Inject them as global keyframes here. */
const ROOM_LOADER_KEYFRAMES = `
@keyframes svrCardDeal0 {
  0%   { transform: translate(0, -60px) rotate(0) scale(.55); opacity: 0 }
  30%  { opacity: 1 }
  100% { transform: translate(-46px, 0) rotate(-14deg) scale(1); opacity: 1 }
}
@keyframes svrCardDeal1 {
  0%   { transform: translate(0, -60px) rotate(0) scale(.55); opacity: 0 }
  30%  { opacity: 1 }
  100% { transform: translate(0, -6px) rotate(0deg) scale(1.05); opacity: 1 }
}
@keyframes svrCardDeal2 {
  0%   { transform: translate(0, -60px) rotate(0) scale(.55); opacity: 0 }
  30%  { opacity: 1 }
  100% { transform: translate(46px, 0) rotate(14deg) scale(1); opacity: 1 }
}
@keyframes svrCardBob {
  0%, 100% { margin-top: 0 }
  50%      { margin-top: -9px }
}
`;

interface RoomLoaderProps {
  room?: Room | null;
  theme?: string;
  creating?: boolean;
}

export function RoomLoader({ room, theme, creating = false }: RoomLoaderProps) {
  // Defer the Telegram fullscreen request until after the loader has
  // painted at least one frame. Otherwise the viewport expands the moment
  // the button is tapped and the user sees the screen jump to fullscreen
  // before any entry animation has appeared.
  useEffect(() => {
    const id = window.setTimeout(() => {
      requestTelegramFullscreen();
    }, 120);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={styles.root}>
      <style>{ROOM_LOADER_KEYFRAMES}</style>
      <div className={styles.cardsRow}>
        {CARDS.map((card, idx) => (
          <div
            key={idx}
            className={styles.card}
            style={{
              background: theme === 'dark' ? '#fdfdfd' : '#ffffff',
              color: card.color,
              zIndex: card.z,
              animation:
                card.anim +
                ' 1s cubic-bezier(.22,.94,.36,1) ' +
                card.delay +
                ' both, svrCardBob 3.6s cubic-bezier(.45,.05,.55,.95) ' +
                card.bobDelay +
                ' infinite',
            }}
          >
            <div className={styles.cardTop}>{'7'}</div>
            <div className={styles.cardSuit}>{card.suit}</div>
            <div className={styles.cardBottom}>{'7'}</div>
          </div>
        ))}
      </div>
      <div className={styles.statusCol}>
        <div className={styles.statusTitle}>
          {creating ? 'Ваша комната создаётся...' : 'Вход в комнату №' + (room && room.num) + '...'}
        </div>
        <div className={styles.statusSub}>
          {creating ? 'Готовим стол №' + (room && room.num) : 'Подключаемся к столу'}
        </div>
      </div>
    </div>
  );
}
