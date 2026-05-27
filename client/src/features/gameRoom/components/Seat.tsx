import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { hapticTap } from '../../../services/haptics';
import {
  ANCHORS,
  AVATAR,
  C,
  CARD_OFFSETS,
  DEAL_STAGGER_MS,
  lerpPct,
  polarToCoords,
  SEAT_POLAR,
  SEAT_ROTATE_MS,
  type SeatAnchorPos,
  shortArc,
} from '../constants';
import { type Card, svaraHandScore } from '../deck';
import { MyHand, SeatCard } from './Cards';
import { LottieEmoji } from './Chat';
import styles from './Seat.module.css';

export interface SeatData {
  empty?: boolean;
  me?: boolean;
  dealer?: boolean;
  photo?: string | number;
  name?: string;
  stack?: string | number;
  // Stable seat id (string or number). Threaded to NamePlate so the ante
  // overlay can locate this seat's nameplate via `data-ante-anchor`.
  id?: string | number | null;
}

export interface SeatReaction {
  id: string | number;
  kind: 'text' | 'emoji';
  value?: string;
  emojiId?: string;
}

/**
 * Transient game-action bubble shown above a seat's avatar for
 * ~2.5s after each player action. `id` is a monotonic counter so
 * remounting the bubble re-triggers the CSS pop-in animation even
 * when the same player repeats the same action text. `tone` picks
 * one of the three action-button colour treatments so the badge
 * reads the same as the matching button in the bottom action bar:
 *   - red   — «Пас»
 *   - green — «Уравнял» / «Повысил» / «В свару»
 *   - blue  — «Тёмная» / «Смотрит»
 */
export type SeatActionTone = 'red' | 'green' | 'blue';
export interface SeatActionLabel {
  id: number;
  text: string;
  tone: SeatActionTone;
}

interface AvatarProps {
  photo?: string | number | null;
  name?: string;
  size?: number;
  winner?: boolean;
}

// Neutral silhouette used when the player has no Telegram photo (e.g. the
// user disabled photo sharing or the account has no avatar set). Rendered as
// an inline SVG data URI so the fallback never depends on a remote image
// service (the previous `i.pravatar.cc` fallback was a UI mock that leaked
// into production — a real player would see a stranger's face above their
// seat).
const FALLBACK_AVATAR_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>` +
      `<stop offset='0%' stop-color='#3a4a5e'/>` +
      `<stop offset='100%' stop-color='#1d2735'/></linearGradient></defs>` +
      `<rect width='64' height='64' fill='url(#g)'/>` +
      `<circle cx='32' cy='25' r='11' fill='rgba(255,255,255,0.55)'/>` +
      `<path d='M14 56 C14 42 50 42 50 56 Z' fill='rgba(255,255,255,0.55)'/>` +
      `</svg>`,
  );

function Avatar({ photo, name, size = AVATAR, winner = false }: AvatarProps) {
  // Real Telegram avatars come through as `https://...` strings. Numeric
  // stand-ins (legacy mock seeds) still resolve through pravatar so demo
  // tables keep their look, but anything empty/missing falls back to the
  // local silhouette rather than hitting an external mock service.
  const url =
    typeof photo === 'string' && photo.length > 0 && /^(https?:)?\/\//i.test(photo)
      ? photo
      : typeof photo === 'number'
        ? `https://i.pravatar.cc/120?img=${photo}`
        : FALLBACK_AVATAR_SVG;
  const showInitial = url === FALLBACK_AVATAR_SVG && !!name?.trim();
  const initial = showInitial ? (name as string).trim().charAt(0).toUpperCase() : '';
  return (
    <div
      className={`${styles.avatarWrap}${winner ? ' ' + styles.avatarWrapWinner : ''}`}
      style={{ width: size, height: size }}
    >
      {winner && <div aria-hidden className={styles.avatarHalo} />}
      <div
        className={`${styles.avatar}${winner ? ' ' + styles.avatarWinner : ''}`}
        style={{ width: size, height: size, backgroundImage: `url("${url}")` }}
      >
        {showInitial && (
          <span
            aria-hidden
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 700,
              fontSize: Math.round(size * 0.42),
              lineHeight: 1,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            }}
          >
            {initial}
          </span>
        )}
      </div>
      {winner && (
        <div aria-hidden className={styles.avatarSparkles}>
          <span className={`${styles.sparkle} ${styles.s1}`} />
          <span className={`${styles.sparkle} ${styles.s2}`} />
          <span className={`${styles.sparkle} ${styles.s3}`} />
          <span className={`${styles.sparkle} ${styles.s4}`} />
          <span className={`${styles.sparkle} ${styles.s5}`} />
          <span className={`${styles.sparkle} ${styles.s6}`} />
        </div>
      )}
    </div>
  );
}

function SeatInviteArrow() {
  // Polished gold "take a seat" arrow that bounces just above an empty avatar.
  // Slim profile + soft warm halo behind. Sits close to the avatar with a
  // gentle bounce so it reads as "come here" without dominating the table.
  return (
    <div aria-hidden className={styles.inviteArrow}>
      <div className={styles.inviteHalo} />
      <svg width="22" height="30" viewBox="0 0 22 30" fill="none" className={styles.inviteSvg}>
        <defs>
          <linearGradient id="svrArrowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE89A" />
            <stop offset="38%" stopColor="#FFC75A" />
            <stop offset="72%" stopColor="#E89A1F" />
            <stop offset="100%" stopColor="#B26A0A" />
          </linearGradient>
          <linearGradient id="svrArrowShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Slim arrow body: flat top, narrows to chevron at bottom */}
        <path
          d="M7 2 H15 Q17 2 17 4 V13 H21 L11 28 L1 13 H5 V4 Q5 2 7 2 Z"
          fill="url(#svrArrowFill)"
          stroke="#6E3F00"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Inner glossy highlight along the left side */}
        <path d="M6 4 H10 V12 H6 Z" fill="url(#svrArrowShine)" opacity="0.9" />
        {/* Tiny shine dot near the top */}
        <ellipse cx="8" cy="6" rx="2" ry="0.9" fill="#FFFFFF" opacity="0.55" />
      </svg>
    </div>
  );
}

interface EmptySeatInviteProps {
  onClick?: () => void;
  size?: number;
  spectator?: boolean;
}

function EmptySeatInvite({ onClick, size = AVATAR, spectator = false }: EmptySeatInviteProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={spectator ? 'Сесть за стол' : 'Пригласить друга'}
      className={styles.emptyBtn}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className={styles.emptyAvatar} style={{ width: size, height: size }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.45)" />
          <path
            d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className={styles.emptyPlus}>+</div>
      </div>
    </button>
  );
}

/* ── Turn-timer helpers ──────────────────────────────────────────── */

function timerColor(progress: number): string {
  if (progress > 0.5) {
    const t = (progress - 0.5) / 0.5;
    const r = Math.round(77 + (245 - 77) * (1 - t));
    const g = Math.round(205 + (166 - 205) * (1 - t));
    const b = Math.round(94 + (35 - 94) * (1 - t));
    return `rgb(${r},${g},${b})`;
  }
  const t = progress / 0.5;
  const r = Math.round(226 + (245 - 226) * t);
  const g = Math.round(59 + (166 - 59) * t);
  const b = Math.round(59 + (35 - 59) * t);
  return `rgb(${r},${g},${b})`;
}

interface NamePlateProps {
  name?: string;
  stack?: string | number;
  betLabel?: string;
  // Current Свара score (0–33). When set, a small green chip glued to the
  // left edge of the name plate shows the score — the same chip the me-seat
  // had in v69 before the showdown badge work. Shown for every seat with a
  // hand (showdown + me-seat «Открыть») so all players read identically.
  score?: number | null;
  // When `true`, the score chip swaps to a gold pulse so this seat reads
  // as part of a Svara tie. Driven by GameRoom after showdown.
  svara?: boolean;
  /** 0-1 turn timer progress (1 = full, 0 = expired). Omit to hide. */
  timerProgress?: number | null;
  // Stable seat id stamped onto the nameWrap as `data-ante-anchor`. The
  // ante chip overlay reads each plate's bounding-rect via this attribute
  // so chips fly out from under the player's nameplate (where the avatar
  // and balance live) rather than from the seat anchor point.
  seatId?: string | number | null;
  winner?: boolean;
}

function NamePlate({ name, stack, betLabel, score, svara, timerProgress, seatId, winner }: NamePlateProps) {
  const highlight = !!betLabel;
  const hasScore = typeof score === 'number';
  const hasTimer = typeof timerProgress === 'number' && timerProgress >= 0;
  const color = hasTimer ? timerColor(timerProgress!) : undefined;
  const deg = hasTimer ? timerProgress! * 360 : 0;
  const empty = hasTimer ? 360 - deg : 0;

  // The turn timer is a conic-gradient ring drawn *around* the black
  // name plate. It lives in an absolutely-positioned `.timerRing`
  // sibling inside `.nameWrapOuter` (NOT a layout wrapper around the
  // plate), so:
  //   - it does not add height to the seat → the avatar no longer
  //     bumps up/down when the timer appears or disappears, and
  //   - the gap between the avatar and the plate stays the same as
  //     when no timer is shown (no extra padding sitting in the flex
  //     flow).
  // `.nameWrap` keeps its `overflow: hidden` (the score chip and bet
  // label rely on it), so the ring is rendered OUTSIDE it — that's
  // what `.nameWrapOuter` is for.
  return (
    <div className={styles.nameWrapOuter}>
      {hasTimer && (
        <div
          className={styles.timerRing}
          style={{
            background: `conic-gradient(from 0deg, transparent ${empty}deg, ${color} ${empty}deg 360deg)`,
            boxShadow: `0 0 10px 3px ${color}80`,
          }}
        />
      )}
      <div
        className={styles.nameWrap}
        data-ante-anchor={seatId == null ? undefined : String(seatId)}
        style={{
          background: highlight
            ? C.blue
            : 'linear-gradient(180deg, #3c3d40 0%, #25262a 55%, #18191c 100%)',
        }}
      >
        {hasScore && (
          <div
            className={`${styles.scoreChip} ${svara ? styles.scoreChipSvara : ''} ${winner ? styles.scoreChipWinner : ''}`}
            aria-label={`Очки: ${score}`}
          >
            {score}
          </div>
        )}
        <div className={styles.nameRight}>
          {betLabel && <div className={styles.betLabel}>{betLabel}</div>}
          <div className={styles.nameBox}>
            <div className={styles.nameText}>{name}</div>
            <div
              className={styles.stackText}
              style={{ color: highlight ? '#ffffff' : C.green }}
            >
              {stack}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DealerChipProps {
  side: 'left' | 'right';
}

function DealerChip({ side }: DealerChipProps) {
  return <div className={`${styles.dealerChip} ${side === 'left' ? styles.left : styles.right}`}>D</div>;
}

interface ActionBubbleProps {
  label?: SeatActionLabel | null;
}

const ACTION_TONE_CLASS: Record<SeatActionTone, string> = {
  red: styles.actionBubbleRed,
  green: styles.actionBubbleGreen,
  blue: styles.actionBubbleBlue,
};

function ActionBubble({ label }: ActionBubbleProps) {
  if (!label) return null;
  const toneClass = ACTION_TONE_CLASS[label.tone] ?? styles.actionBubbleGreen;
  return (
    <div
      key={label.id}
      className={`${styles.actionBubble} ${toneClass}`}
      aria-live="polite"
    >
      <span className={styles.actionBubbleText}>{label.text}</span>
    </div>
  );
}

interface ReactionBubbleProps {
  reaction?: SeatReaction | null;
}

function ReactionBubble({ reaction }: ReactionBubbleProps) {
  if (!reaction) return null;
  return (
    <div key={reaction.id} className={styles.reactionBubble}>
      <div
        className={`${styles.reactionInner} ${reaction.kind === 'emoji' ? styles.emoji : styles.text}`}
      >
        {reaction.kind === 'emoji' ? (
          <LottieEmoji
            emojiId={reaction.emojiId ?? ''}
            fallback={reaction.value ?? ''}
            size={42}
            loop={false}
          />
        ) : (
          reaction.value
        )}
        <div className={styles.reactionTail} />
      </div>
    </div>
  );
}

export interface SeatProps {
  seat: SeatData;
  displayPos: SeatAnchorPos;
  reaction?: SeatReaction | null;
  dealing?: boolean;
  onInvite?: () => void;
  spectator?: boolean;
  onTakeSeat?: (seat: SeatData) => void;
  activeDealOrder: SeatAnchorPos[];
  animateMove?: boolean;
  hideInviteArrow?: boolean;
  dim?: boolean;
  // Face-up 3-card hand to render above/beside the seat. Used both by
  // the local player opening their own cards ('Открыть') and by the
  // global showdown that flips every seat at the end of a round.
  hand?: Card[];
  // When `true`, this seat is part of the current Svara tie — its score
  // chip / hand-score badge swap to a gold pulse animation.
  svara?: boolean;
  /** 0-1 turn timer progress (1 = full, 0 = expired). Omit to hide. */
  timerProgress?: number | null;
  /** When true, dealt face-down cards are hidden (after auto-fold). */
  hideCards?: boolean;
  /** When true, this seat is the round winner — crown, glow, score blink. */
  winner?: boolean;
  /** Formatted win amount (e.g. "+$60"). Shown after chips land. */
  winnerAmount?: string | null;
  /**
   * Transient action label («Тёмная $10» / «Смотрит» / …) shown above the
   * avatar for ~2.5s. The `id` field is a monotonic counter so the
   * bubble re-mounts and replays the pop-in animation when the same
   * player triggers the same action again.
   */
  actionLabel?: SeatActionLabel | null;
  /**
   * Monotonic counter that ticks every time the round leaves the
   * `blind_betting` phase. When it changes, this seat replays a short
   * shake animation on its face-down dealt cards (the rubashka pile)
   * to flag that everyone's cards are now considered «открыты» — no
   * more blind betting until the next round.
   */
  cardsRevealPulseId?: number;
}

function SeatImpl({
  seat,
  displayPos,
  reaction,
  dealing,
  onInvite,
  spectator,
  onTakeSeat,
  activeDealOrder,
  animateMove,
  hideInviteArrow,
  dim,
  hand,
  svara,
  timerProgress,
  hideCards,
  winner,
  winnerAmount,
  actionLabel,
  cardsRevealPulseId,
}: SeatProps) {
  const a = ANCHORS[displayPos];
  // Dealer chip sits next to the name plate, on the side facing the
  // centre of the table (so it doesn't get cut off by the screen edge).
  const dealerSide = displayPos.includes('right') ? 'left' : 'right';
  const seatIdx = activeDealOrder.indexOf(displayPos);

  // Replay a short shake on the dealt-card stack whenever the parent
  // ticks `cardsRevealPulseId`. The CSS animation length is in
  // `Seat.module.css` (`@keyframes svrCardReveal`); we keep the class
  // mounted for slightly longer than the animation so React doesn't
  // race the keyframe to completion.
  const [cardShake, setCardShake] = useState(false);
  const cardShakeIdRef = useRef<number | undefined>(cardsRevealPulseId);
  useEffect(() => {
    if (cardsRevealPulseId === undefined) return;
    if (cardShakeIdRef.current === cardsRevealPulseId) return;
    cardShakeIdRef.current = cardsRevealPulseId;
    // Skip the initial mount tick — we only want to react to actual
    // server-side transitions, not the first render after a refresh.
    if (cardsRevealPulseId === 0) return;
    setCardShake(true);
    const t = window.setTimeout(() => setCardShake(false), 1100);
    return () => window.clearTimeout(t);
  }, [cardsRevealPulseId]);

  // Animate the seat around the table perimeter (instead of letting CSS
  // interpolate top/left in a straight line that cuts across the felt).  We
  // drive the motion with the Web Animations API in useLayoutEffect so the
  // arc kicks in before the browser paints the destination anchor.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const prevPosRef = useRef<SeatAnchorPos>(displayPos);
  const animRef = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const prev = prevPosRef.current;
    if (prev === displayPos) return;
    prevPosRef.current = displayPos;
    if (!animateMove || !wrapRef.current) return;
    if (animRef.current) animRef.current.cancel();
    const fromA = ANCHORS[prev];
    const toA = ANCHORS[displayPos];
    const fromPolar = SEAT_POLAR[prev];
    const toPolar = SEAT_POLAR[displayPos];
    const span = shortArc(fromPolar.theta, toPolar.theta);
    const STOPS = 9;
    const frames: Array<{ top: string; left: string; transform: string }> = [];
    for (let i = 0; i < STOPS; i += 1) {
      const t = i / (STOPS - 1);
      if (i === 0) {
        frames.push({
          top: fromA.top,
          left: fromA.left,
          transform: `translate(${fromA.tx}, ${fromA.ty})`,
        });
      } else if (i === STOPS - 1) {
        frames.push({
          top: toA.top,
          left: toA.left,
          transform: `translate(${toA.tx}, ${toA.ty})`,
        });
      } else {
        const theta = fromPolar.theta + t * span;
        const r = fromPolar.r + t * (toPolar.r - fromPolar.r);
        const { top, left } = polarToCoords(theta, r);
        frames.push({
          top: `${top.toFixed(2)}%`,
          left: `${left.toFixed(2)}%`,
          transform: `translate(${lerpPct(fromA.tx, toA.tx, t)}, ${lerpPct(fromA.ty, toA.ty, t)})`,
        });
      }
    }
    animRef.current = wrapRef.current.animate(frames, {
      duration: SEAT_ROTATE_MS,
      easing: 'cubic-bezier(.22,.61,.36,1)',
      fill: 'both',
    });
  }, [displayPos, animateMove]);

  return (
    <div
      ref={wrapRef}
      className={styles.seatWrap}
      style={{ top: a.top, left: a.left, transform: `translate(${a.tx}, ${a.ty})` }}
    >
      {seat.empty ? (
        <>
          {spectator && !hideInviteArrow && <SeatInviteArrow />}
          <EmptySeatInvite
            onClick={
              spectator
                ? () => {
                    hapticTap();
                    onTakeSeat?.(seat);
                  }
                : onInvite
            }
            spectator={spectator}
          />
          {/* Invisible spacer so empty-seat container matches the occupied seat
              container size (avatar + name plate). This keeps tx/ty percentage
              translations producing the same pixel offsets for both states. */}
          <div aria-hidden className={styles.spacer} />
        </>
      ) : (
        <div
          className={styles.seatContent}
          style={{ opacity: dim ? 0.55 : 1, filter: dim ? 'saturate(0.7)' : undefined }}
        >
          <div className={styles.relative}>
            {dealing && seatIdx >= 0 && !hand && !hideCards && (
              <div className={cardShake ? styles.cardsReveal : undefined}>
                {CARD_OFFSETS.map((_, cardIdx) => (
                  <SeatCard
                    key={cardIdx}
                    pos={displayPos}
                    cardIndex={cardIdx}
                    delayMs={(cardIdx * activeDealOrder.length + seatIdx) * DEAL_STAGGER_MS}
                  />
                ))}
              </div>
            )}
            {hand ? (
              <MyHand
                cards={hand}
                pos={displayPos}
                // Opponents get a red circular «очко» badge on top of their
                // fan once the showdown reveals the cards. The me-seat keeps
                // its existing green chip on the name plate, so we don't pass
                // a score here for `seat.me`.
                score={!seat.me && hand.length > 0 ? svaraHandScore(hand) : null}
                svara={svara}
                winner={!!winner}
              />
            ) : null}
            <ReactionBubble reaction={reaction} />
            {/* Avatar + crown + win-amount badge live in a sub-wrapper so
                we can translate the whole group up for the me-seat winner.
                On the bottom seat the open hand fan covers the avatar, so
                lifting it brings the photo and crown above the cards.
                MyHand / SeatCard stay outside the wrapper so the card
                positions don't move. */}
            <div
              className={`${styles.avatarStack} ${
                seat.me && winner ? styles.avatarStackLifted : ''
              }`}
            >
              {winner && <div className={styles.winnerCrown}>👑</div>}
              <Avatar photo={seat.photo} name={seat.name} winner={!!winner} />
              {/* Action label sits at the bottom edge of the avatar (between
                  the photo and the name plate). Rendered inside the same
                  stack as the winner-amount badge so both share the same
                  anchor — we just hide the action pill when the winner pill
                  is on screen to avoid a visual collision. */}
              {!winnerAmount && <ActionBubble label={actionLabel} />}
              {winnerAmount && (
                <div className={styles.winnerAmount}>{winnerAmount}</div>
              )}
            </div>
          </div>
          <div className={styles.relative}>
            <NamePlate
              name={seat.name}
              stack={seat.stack}
              // Green «очко» chip lives on the me-seat only — opponents'
              // scores read off the card faces themselves so the felt
              // stays uncluttered when every seat reveals.
              score={
                seat.me && hand && hand.length > 0 ? svaraHandScore(hand) : null
              }
              svara={svara}
              timerProgress={timerProgress}
              seatId={seat.id}
              winner={!!winner}
            />
            {seat.dealer && <DealerChip side={dealerSide as 'left' | 'right'} />}
          </div>
        </div>
      )}
    </div>
  );
}
export const Seat = memo(SeatImpl);
