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
  // True when the local player can still buy into the svara (i.e. they
  // folded earlier this hand and the server is in `svara_pending`). The
  // join/decline popup is rendered only for them — tied participants are
  // auto-confirmed on the server and don't need to press anything.
  canDecide: boolean;
  // True when the local player is a tied svara participant. They don't
  // need to make a decision (they're already in), but they still need a
  // visible «ждём остальных» panel with the same 15-sec countdown so
  // they don't think the game has frozen while non-participants decide.
  isParticipant: boolean;
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
  isParticipant,
  joinCost,
  onJoin,
  onDecline,
}: SvaraBannerProps) {
  // Auto-decline countdown — shared between the join/skip popup and the
  // participant «ждём остальных» panel so both groups see the same 15-sec
  // timer.
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DECLINE_SECONDS);
  // Latest decline callback so the timeout below doesn't capture a stale
  // reference if GameRoom rebinds the handler between renders.
  const onDeclineRef = useRef(onDecline);
  useEffect(() => {
    onDeclineRef.current = onDecline;
  }, [onDecline]);

  const popupActive =
    phase === 'choose' && canDecide && myDecision === null;
  // Show the waiting panel during the choose phase for tied participants.
  // 2-player svara: the server resolves immediately, so the panel barely
  // flashes — but it still confirms to the user that everything is fine.
  const waitingActive = phase === 'choose' && isParticipant;
  const countdownActive = popupActive || waitingActive;

  useEffect(() => {
    if (!countdownActive) {
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
    // Only the join/skip popup auto-declines on expiry. The waiting panel
    // for tied participants relies on the server to resolve the svara
    // (it auto-confirms them and starts the next round).
    const expire = popupActive
      ? window.setTimeout(() => {
          onDeclineRef.current();
        }, AUTO_DECLINE_SECONDS * 1000)
      : null;
    return () => {
      window.clearInterval(tick);
      if (expire !== null) window.clearTimeout(expire);
    };
  }, [countdownActive, popupActive]);

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

  const timerLabel = formatTimer(secondsLeft);

  // Tied participants are auto-confirmed on the server. They don't need
  // to make a decision — we just keep them informed with a small panel
  // («Ждём остальных» + same 15-sec countdown) so they don't think
  // the game has hung while other players decide.
  if (waitingActive) {
    return (
      <div className={styles.popupOverlay} role="status" aria-label="Свара">
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
          <div className={styles.popupDesc}>Ждём остальных игроков…</div>
        </div>
      </div>
    );
  }

  // Once the local player makes their decision, the popup dismisses
  // itself — score chips keep pulsing so it's still obvious which seats
  // are in svara. Non-eligible players (canDecide=false) have nothing
  // to press, so the popup hides for them too once the announce stage ends.
  if (!popupActive) return null;

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
