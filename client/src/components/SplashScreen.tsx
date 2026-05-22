import { useEffect, useRef, useState } from 'react';

import styles from './SplashScreen.module.css';

const CARDS = [
  { suit: '\u2665', color: '#e54848', anim: 'svrSpFlip0', delay: '0s', z: 1 },
  { suit: '\u2663', color: '#1a2533', anim: 'svrSpFlip1', delay: '.15s', z: 3 },
  { suit: '\u2666', color: '#e54848', anim: 'svrSpFlip2', delay: '.3s', z: 2 },
];

/* Card-flip keyframes live in a global <style> block (rendered below)
 * rather than in SplashScreen.module.css. They are referenced from
 * inline-styled markup via a literal name like `'svrSpFlip0'`; CSS Modules
 * locally-scopes `@keyframes` so a literal reference cannot find the
 * compiled name. The same pattern is used by GameRoomKeyframes.tsx. */
const FLIP_KEYFRAMES = `
@keyframes svrSpFlip0 {
  0%   { transform: translate(-30px, 40px) rotateY(180deg) scale(.7); opacity: 0 }
  60%  { opacity: 1 }
  100% { transform: translate(-46px, 0) rotateY(0deg) rotate(-14deg) scale(1); opacity: 1 }
}
@keyframes svrSpFlip1 {
  0%   { transform: translate(0, 40px) rotateY(180deg) scale(.7); opacity: 0 }
  60%  { opacity: 1 }
  100% { transform: translate(0, -6px) rotateY(0deg) rotate(0deg) scale(1.05); opacity: 1 }
}
@keyframes svrSpFlip2 {
  0%   { transform: translate(30px, 40px) rotateY(180deg) scale(.7); opacity: 0 }
  60%  { opacity: 1 }
  100% { transform: translate(46px, 0) rotateY(0deg) rotate(14deg) scale(1); opacity: 1 }
}
`;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  // Keep the latest onDone in a ref so the splash timer doesn't restart
  // every time the parent re-creates the callback. The timeouts read the
  // ref at the moment they fire, which is what we want.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2700);
    const t2 = setTimeout(() => onDoneRef.current && onDoneRef.current(), 3450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      onClick={() => {
        setExiting(true);
        setTimeout(() => onDone && onDone(), 350);
      }}
      className={styles.root}
      style={{
        opacity: exiting ? 0 : 1,
        transitionDelay: exiting ? '.15s' : '0s',
      }}
    >
      <style>{FLIP_KEYFRAMES}</style>
      <div className={styles.content + (exiting ? ' ' + styles.contentExiting : '')}>
        <div className={styles.cardsRow}>
          {CARDS.map((card, idx) => (
            <div
              key={idx}
              className={styles.card}
              style={{
                color: card.color,
                zIndex: card.z,
                animation: card.anim + ' .9s cubic-bezier(.22,.94,.36,1) ' + card.delay + ' both',
              }}
            >
              <div className={styles.cardCornerTop}>{'7'}</div>
              <div className={styles.cardSuit}>{card.suit}</div>
              <div className={styles.cardCornerBottom}>{'7'}</div>
            </div>
          ))}
        </div>
        <div className={styles.heroBlock}>
          <div className={styles.heroTitle}>{'SVARA'}</div>
          <div className={styles.heroSubtitle}>{'online'}</div>
        </div>
      </div>
      <div className={styles.skipHint}>{'Тапни, чтобы пропустить'}</div>
    </div>
  );
}
