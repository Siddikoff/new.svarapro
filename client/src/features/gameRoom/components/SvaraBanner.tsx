import { memo, useEffect, useRef, useState } from 'react';

import styles from './SvaraBanner.module.css';

export type SvaraDecision = 'join' | 'decline';
// Two-stage svara UI:
//  - 'announce' : a big centred SVARA word pulses 3-4 times on the felt.
//                 No buttons yet — gives the player a moment to read the
//                 tie before being asked to decide.
//  - 'choose'   : a compact popup card slides in with the join/decline
//                 buttons. GameRoom flips the phase after the announce
//                 animation finishes (~4.1s).
export type SvaraPhase = 'announce' | 'choose';

// How long the choose popup stays open before auto-declining. If the
// player doesn't pick join/decline within this window, the popup invokes
// onDecline() automatically and dismisses itself.
const AUTO_DECLINE_SECONDS = 15;

export interface SvaraBannerProps {
  // Drives the two-stage UI described above.
  phase: SvaraPhase;
  // The local player's decision, if they already chose. `null` keeps the
  // join/decline buttons visible. Once set, the popup dismisses itself.
  myDecision: SvaraDecision | null;
  // True when the local player is one of the tied seats. When false, the
  // popup hides itself (only participants need to decide).
  canDecide: boolean;
  // Amount shown on the «Присоединиться» button — the cost to enter the
  // svara round. Until the backend wires real svara entry fees this is
  // just the current blind amount.
  joinCost: number;
  onJoin: () => void;
  onDecline: () => void;
}

function SvaraBannerImpl({
  phase,
  myDecision,
  canDecide,
  joinCost,
  onJoin,
  onDecline,
}: SvaraBannerProps) {
  // Auto-decline countdown — runs only while the popup is visible
  // (choose phase, the player can decide, and hasn't decided yet).
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DECLINE_SECONDS);
  // Latest decline callback so the timeout below doesn't capture a stale
  // reference if GameRoom rebinds the handler between renders.
  const onDeclineRef = useRef(onDecline);
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  const popupActive =
    phase === 'choose' && canDecide && myDecision === null;

  useEffect(() => {
    if (!popupActive) {
      setSecondsLeft(AUTO_DECLINE_SECONDS);
      return;
    }
    setSecondsLeft(AUTO_DECLINE_SECONDS);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, AUTO_DECLINE_SECONDS - Math.floor(elapsed));
      setSecondsLeft(left);
    }, 200);
    const expire = window.setTimeout(() => {
      onDeclineRef.current();
    }, AUTO_DECLINE_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(expire);
    };
  }, [popupActive]);

  if (phase === 'announce') {
    return (
      <div className={styles.announceWrap} aria-live="polite" aria-label="Свара">
        <div className={styles.announceStack}>
          <div className={styles.announceHalo} aria-hidden />
          <div className={styles.announceRays} aria-hidden />
          <div className={styles.announceTitle}>SVARA</div>
          <div className={styles.announceFlourish} aria-hidden>
            <span className={styles.announceDiamond} />
          </div>
        </div>
      </div>
    );
  }

  // Once the local player makes their decision, the popup dismisses
  // itself — score chips keep pulsing so it's still obvious which seats
  // are in svara. Non-participants (canDecide=false) have nothing to
  // press, so the popup hides for them too once the announce stage ends.
  if (!popupActive) return null;

  const timerLabel = formatTimer(secondsLeft);

  return (
    <div className={styles.popupOverlay} role="dialog" aria-label="Свара">
      {/* Telegram-style bottom-sheet: drag handle, brand row, timer chip,
          question, prominent join button + secondary skip text-button. */}
      <div className={styles.popupSheet}>
        <div className={styles.popupHandle} aria-hidden />
        <div className={styles.popupHeader}>
          <div className={styles.popupTitleRow}>
            <div className={styles.popupSpark} aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>
            <div className={styles.popupTitle}>СВАРА</div>
          </div>
          <div className={styles.popupTimer} aria-live="polite">
            {timerLabel}
          </div>
        </div>
        <div className={styles.popupDesc}>Присоединитесь или пропустите свару?</div>
        <div className={styles.popupActions}>
          <button
            type="button"
            className={styles.svrPrimaryBtn}
            onClick={onJoin}
          >
            <span>Присоединиться</span>
            <span className={styles.svrPrimaryAmt}>−${joinCost}</span>
          </button>
          <button
            type="button"
            className={styles.svrSecondaryBtn}
            onClick={onDecline}
          >
            Пропустить свару
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const SvaraBanner = memo(SvaraBannerImpl);
