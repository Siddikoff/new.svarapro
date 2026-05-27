import { memo, useLayoutEffect, useRef } from 'react';

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
import type { Card } from '../deck';
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
  // Server-authoritative Свара score (7..34) populated after `look` /
  // showdown / svara resolution. The UI prefers this value over any
  // locally-computed score so the joker (7♣) substitution rule on the
  // backend doesn't disagree with the client and so all players see
  // the same number for a svara tie.
  score?: number | null;
}

export interface SeatReaction {
  id: string | number;
  kind: 'text' | 'emoji';
  value?: string;
  emojiId?: string;
}

interface AvatarProps {
  photo: string | number;
  size?: number;
  winner?: boolean;
}

function Avatar({ photo, size = AVATAR, winner = false }: AvatarProps) {
  // Photo is either a numeric pravatar.cc seed (legacy v143 stand-ins) or a
  // direct URL string (real Telegram/CDN avatars). Treat anything that
  // looks like a protocol URL as the literal image URL.
  const url =
    typeof photo === 'string' && /^(https?:)?\/\//i.test(photo)
      ? photo
      : `https://i.pravatar.cc/120?img=${photo}`;
  return (
    <div
      className={`${styles.avatarWrap}${winner ? ' ' + styles.avatarWrapWinner : ''}`}
      style={{ width: size, height: size }}
    >
      {winner && <div aria-hidden className={styles.avatarHalo} />}
      <div
        className={`${styles.avatar}${winner ? ' ' + styles.avatarWinner : ''}`}
        style={{ width: size, height: size, backgroundImage: `url(${url})` }}
      />
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
}: SeatProps) {
  const a = ANCHORS[displayPos];
  // Dealer chip sits next to the name plate, on the side facing the
  // centre of the table (so it doesn't get cut off by the screen edge).
  const dealerSide = displayPos.includes('right') ? 'left' : 'right';
  const seatIdx = activeDealOrder.indexOf(displayPos);

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
            {dealing &&
              seatIdx >= 0 &&
              !hand &&
              !hideCards &&
              CARD_OFFSETS.map((_, cardIdx) => (
                <SeatCard
                  key={cardIdx}
                  pos={displayPos}
                  cardIndex={cardIdx}
                  delayMs={(cardIdx * activeDealOrder.length + seatIdx) * DEAL_STAGGER_MS}
                />
              ))}
            {hand ? (
              <MyHand
                cards={hand}
                pos={displayPos}
                // Opponents get a red circular «очко» badge on top of their
                // fan once the showdown reveals the cards. The me-seat keeps
                // its existing green chip on the name plate, so we don't pass
                // a score here for `seat.me`. Score is the authoritative
                // value from the server snapshot — the client never
                // recomputes it, so all players see the same number for
                // svara ties (incl. the joker 7♣ substitution rule).
                score={!seat.me && hand.length > 0 ? seat.score ?? null : null}
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
              <Avatar photo={seat.photo ?? 0} winner={!!winner} />
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
              // stays uncluttered when every seat reveals. Score is the
              // server-authoritative value (`seat.score`) — never recomputed
              // on the client.
              score={
                seat.me && hand && hand.length > 0 ? seat.score ?? null : null
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
