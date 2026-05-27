import { type CSSProperties,memo, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { SeatAnchorPos } from '../constants';
import {
  ANCHORS,
  CARD_OFFSETS,
  DEAL_DURATION_MS,
  DEAL_STAGGER_MS,
  FOLD_START_ANCHORS,
  HAND_ENTER_DURATION_MS,
  HAND_FLIP_DURATION_MS,
  HAND_FOLD_FLIGHT_MS,
  HAND_FOLD_REST_MS,
  HAND_FOLD_REST_SCALE,
  HAND_FOLD_SIDE_TRAVEL_FRACTION,
  HAND_FOLD_TOTAL_MS,
  HAND_FOLD_TRAVEL_FRACTION,
} from '../constants';
import { type Card,cardImageUrl } from '../deck';
import styles from './Cards.module.css';

interface CardBackProps {
  rotate?: number;
  dx?: number;
  w?: number;
  h?: number;
}

function CardBack({ rotate = 0, dx = 0, w = 32, h = 44 }: CardBackProps) {
  return (
    <div
      className={styles.cardBack}
      style={{
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        transform: `translateX(${dx}px) rotate(${rotate}deg)`,
      }}
    />
  );
}

interface CardPairProps {
  side?: 'left' | 'right';
}

function CardPairImpl({ side = 'right' }: CardPairProps) {
  const flip = side === 'left' ? -1 : 1;
  return (
    <div className={styles.pairWrap}>
      <CardBack rotate={flip * 10} dx={-flip * 4} />
      <CardBack rotate={flip * -2} dx={flip * 6} />
    </div>
  );
}
export const CardPair = memo(CardPairImpl);

interface SeatCardProps {
  pos: SeatAnchorPos;
  cardIndex: number;
  delayMs: number;
}

// One card-back that lifts off the top of the centre deck and flies to its
// slot in the seat's fan.
//
// Once the deal animation has completed for this card, the CSS `animation:`
// declaration is replaced with a static `transform:` matching the final
// keyframe. Mobile browsers (notably Telegram's iOS / Android WebView)
// restart still-active `animation`-driven elements when the visual viewport
// changes — e.g. when the user rotates the device or the URL bar collapses
// — which would otherwise replay the entire card-fly animation mid-round.
// Swapping to a transform after settle removes the active animation so the
// browser has nothing to restart.
function SeatCardImpl({ pos, cardIndex, delayMs }: SeatCardProps) {
  const sideKey = pos.includes('right') ? 'left' : 'right';
  const safe = pos.replace('-', '_');
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(
      () => setSettled(true),
      delayMs + DEAL_DURATION_MS,
    );
    return () => window.clearTimeout(id);
  }, [delayMs]);

  const off = CARD_OFFSETS[cardIndex];
  const motionStyle: CSSProperties = settled
    ? {
        transform: `translate3d(${off.x}px, ${off.y}px, 0) rotate(${off.r}deg)`,
        opacity: 1,
      }
    : {
        animation: `svrDeal_${safe}_${cardIndex} ${DEAL_DURATION_MS}ms cubic-bezier(.22,.94,.36,1) ${delayMs}ms both`,
      };

  return (
    <div
      className={styles.seatCard}
      style={{
        [sideKey]: -14,
        zIndex: 10 + cardIndex,
        ...motionStyle,
      }}
    />
  );
}
export const SeatCard = memo(SeatCardImpl);

const FALLBACK_AVATAR_SVG_SMALL =
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

function dealerPhotoUrl(photo: string | number | undefined): string {
  if (typeof photo === 'string' && photo.length > 0 && /^(https?:)?\/\//i.test(photo))
    return photo;
  if (typeof photo === 'number') return `https://i.pravatar.cc/120?img=${photo}`;
  return FALLBACK_AVATAR_SVG_SMALL;
}

interface CenterDeckProps {
  totalDeals: number;
  dealerPhoto?: string | number;
}

// Stack of card-backs at the felt center; fades out once all seats are dealt.
//
// Same rationale as `SeatCard` — once the fade has played we swap the
// `animation:` declaration for a static `opacity: 0`. Without this, mobile
// browsers can replay the fade on viewport changes (orientation change /
// URL-bar collapse), making the centre deck momentarily reappear mid-round.
function CenterDeckImpl({ totalDeals, dealerPhoto }: CenterDeckProps) {
  const dealTotalMs = (totalDeals - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS;
  const fadeDelayMs = Math.max(0, dealTotalMs - 80);
  const fadeDurationMs = 320;
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(
      () => setFaded(true),
      fadeDelayMs + fadeDurationMs,
    );
    return () => window.clearTimeout(id);
  }, [fadeDelayMs]);

  return (
    <div
      className={styles.centerDeck}
      style={
        faded
          ? { opacity: 0 }
          : {
              animation: `svrDeckFade ${fadeDurationMs}ms cubic-bezier(.22,.94,.36,1) ${fadeDelayMs}ms forwards`,
            }
      }
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={styles.centerDeckLayer}
          style={{
            transform: `translate(${(i - 1) * 2}px, ${(i - 1) * -1}px) rotate(${(i - 1) * 3}deg)`,
          }}
        />
      ))}
      {dealerPhoto != null && (
        <div
          className={styles.centerDeckDealerPhoto}
          style={{ backgroundImage: `url("${dealerPhotoUrl(dealerPhoto)}")` }}
        />
      )}
    </div>
  );
}
export const CenterDeck = memo(CenterDeckImpl);

// Note: CARD_OFFSETS is intentionally not re-exported here; consumers that
// need it (e.g. the Seat component) import it directly from `../constants`.
export { CARD_OFFSETS };

// The me-seat's "open" hand: 3 face-up cards fanned above the avatar.
const HAND_CARD_W = 60;
const HAND_CARD_H = 84;

// Tight fan matching the reference.
const HAND_FAN = [
  { angle: -7, x: -24, y: 4 },
  { angle: 0, x: 0, y: 0 },
  { angle: 7, x: 24, y: 4 },
];

interface FanSlot {
  angle: number;
  x: number;
  y: number;
}

interface HandCardProps {
  card: Card;
  fan: FanSlot;
}

function HandCard({ card, fan }: HandCardProps) {
  return (
    <div
      className={styles.handCard}
      style={{
        width: HAND_CARD_W,
        height: HAND_CARD_H,
        marginLeft: -HAND_CARD_W / 2,
        transform: `translate3d(${fan.x}px, ${fan.y}px, 0) rotate(${fan.angle}deg)`,
      }}
    >
      <div
        className={styles.handCardInner}
        style={{
          animation: `svrCardFlip ${HAND_FLIP_DURATION_MS}ms cubic-bezier(.22,.94,.36,1) ${HAND_ENTER_DURATION_MS}ms both`,
        }}
      >
        <div className={styles.handCardFaceBack} />
        <div className={styles.handCardFaceFront}>
          <img
            src={cardImageUrl(card)}
            alt={`${card.rank} ${card.suit}`}
            draggable="false"
            className={styles.handCardImg}
          />
        </div>
      </div>
    </div>
  );
}

interface MyHandProps {
  cards: Card[];
  // Position the fan relative to the seat's avatar. Defaults to 'bottom'
  // (cards above the avatar — the original me-seat behaviour). For non-me
  // seats we override this so the fan always points toward the felt centre.
  pos?: SeatAnchorPos;
  // Optional Свара score (0..33) rendered as a red circular badge pinned
  // to the bottom-left of the fan. Used on opponent seats during showdown
  // so every player's hand reads its own «очко» right on the cards. The
  // me-seat keeps its existing green chip on the name plate and does not
  // pass a score here.
  score?: number | null;
  // When `true`, the score badge swaps to a gold pulse animation so the
  // seat reads as part of a Svara tie. No-op when `score` is null.
  svara?: boolean;
  winner?: boolean;
}

// Non-me seats use `scale()` to shrink the fan well below the me-seat's
// 60×84 card metrics so opponent hands sit next to each avatar instead of
// bleeding into the felt centre. The scale is paired with a per-position
// `transformOrigin` so the shrunken fan grows away from the avatar.
//
// Tuned so a revealed card (60 × 0.85 ≈ 51px wide) reads comfortably
// larger than a face-down deck back (32×44, see `.seatCard` in
// `Cards.module.css`) — the open hand should be a touch bigger than the
// cards that were dealt out so faces stay readable.
const NON_ME_FAN_SCALE = 0.85;

// Per-seat positioning for the outer wrapper. The outer wrapper is the
// thing that gets `top/left/right/bottom + scale`; the inner div under it
// owns the entrance animation so the two transforms don't fight each other
// (the old single-wrapper approach was being clobbered by the keyframe's
// hard-coded `translate3d(-50%, …, 0)`).
function seatHandPositionStyle(pos: SeatAnchorPos): CSSProperties {
  switch (pos) {
    case 'top':
      // Wrapper top-edge at avatar's bottom-edge, horizontally centred,
      // scaled downward so the fan hangs below the avatar.
      return {
        left: '50%',
        top: '100%',
        bottom: 'auto',
        marginTop: 2,
        transform: `translate3d(-50%, 0, 0) scale(${NON_ME_FAN_SCALE}) scale(var(--svr-hand-scale, 1))`,
        transformOrigin: '50% 0%',
      };
    case 'left-up':
    case 'left-center':
    case 'left-down':
      // Wrapper left-edge sits just past avatar's right-edge; scale grows
      // the fan rightward, hugging the avatar without crossing the felt.
      return {
        left: '100%',
        top: '50%',
        bottom: 'auto',
        marginLeft: 2,
        transform: `translate3d(0, -50%, 0) scale(${NON_ME_FAN_SCALE}) scale(var(--svr-hand-scale, 1))`,
        transformOrigin: '0% 50%',
      };
    case 'right-up':
    case 'right-center':
    case 'right-down':
      // Mirror of the left-side case.
      return {
        left: 'auto',
        right: '100%',
        top: '50%',
        bottom: 'auto',
        marginRight: 2,
        transform: `translate3d(0, -50%, 0) scale(${NON_ME_FAN_SCALE}) scale(var(--svr-hand-scale, 1))`,
        transformOrigin: '100% 50%',
      };
    case 'bottom':
    default:
      // Me-seat: fan sits above the avatar, full size. Position matches the
      // historic `.myHandWrap` defaults (left: 50%, bottom: 35%) so the
      // me-seat showdown is pixel-identical to the original local-open
      // behaviour.
      return {
        left: '50%',
        bottom: '35%',
        top: 'auto',
        transform: 'translate3d(-50%, 0, 0) scale(var(--svr-hand-scale, 1))',
        transformOrigin: '50% 100%',
      };
  }
}

function MyHandImpl({ cards, pos = 'bottom', score, svara, winner }: MyHandProps) {
  if (!cards || cards.length < 3) return null;
  const maxFanY = HAND_FAN.reduce((m, f) => Math.max(m, f.y), 0);
  const wrapperWidth = HAND_CARD_W + HAND_FAN[2].x * 2;
  const wrapperHeight = HAND_CARD_H + maxFanY;
  const hasScore = typeof score === 'number';
  return (
    <div
      className={styles.myHandPos}
      style={{
        width: wrapperWidth,
        height: wrapperHeight,
        ...seatHandPositionStyle(pos),
      }}
    >
      <div
        className={styles.myHandAnim}
        style={{
          animation: `svrHandEnterInner ${HAND_ENTER_DURATION_MS}ms cubic-bezier(.22,.94,.36,1) both`,
        }}
      >
        {cards.slice(0, 3).map((card, i) => (
          <HandCard key={i} card={card} fan={HAND_FAN[i]} />
        ))}
        {hasScore && (
          <div
            className={`${styles.handScoreBadge} ${svara ? styles.handScoreBadgeSvara : ''} ${winner ? styles.handScoreBadgeWinner : ''}`}
            aria-label={`Очки: ${score}`}
          >
            {score}
          </div>
        )}
      </div>
    </div>
  );
}
export const MyHand = memo(MyHandImpl);

// 3-card face-down stack used by the fold overlay. Unlike `HAND_FAN` (the
// open-hand spread on the me-seat) the fold pile lies completely flat — no
// per-card rotation — with a small horizontal offset between cards so the
// stack still reads as three pieces, not one block.
const FOLD_PILE = [
  { x: -16, y: 0 },
  { x: 0, y: 0 },
  { x: 16, y: 0 },
];

interface FoldCardFanProps {
  sideSeat?: boolean;
}

function FoldCardFan({ sideSeat = false }: FoldCardFanProps) {
  const wrapperWidth = HAND_CARD_W + FOLD_PILE[2].x * 2;
  const wrapperHeight = HAND_CARD_H;
  return (
    <div
      className={styles.foldFan}
      style={{
        width: wrapperWidth,
        height: wrapperHeight,
        transform: sideSeat ? 'rotate(90deg)' : undefined,
      }}
    >
      {FOLD_PILE.map((slot, i) => (
        <div
          key={i}
          className={styles.foldFanCard}
          style={{
            width: HAND_CARD_W,
            height: HAND_CARD_H,
            marginLeft: -HAND_CARD_W / 2,
            transform: `translate3d(${slot.x}px, ${slot.y}px, 0)`,
          }}
        />
      ))}
    </div>
  );
}

// Linearly interpolate two CSS percentage strings (e.g. '100%' and '50%')
// at parameter t in [0, 1] and return the resulting '%' string.
function lerpPct(a: string, b: string, t: number): string {
  const av = parseFloat(a);
  const bv = parseFloat(b);
  return `${(av + (bv - av) * t).toFixed(2)}%`;
}

interface FoldingSeatOverlayProps {
  displayPos: SeatAnchorPos;
}

// Generic per-seat fold overlay.
function FoldingSeatOverlayImpl({ displayPos }: FoldingSeatOverlayProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const anchor = ANCHORS[displayPos];
  const startAnchor = FOLD_START_ANCHORS[displayPos];
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor || !startAnchor) return undefined;
    const flightEnd = HAND_FOLD_FLIGHT_MS / HAND_FOLD_TOTAL_MS;
    const restEnd = (HAND_FOLD_FLIGHT_MS + HAND_FOLD_REST_MS) / HAND_FOLD_TOTAL_MS;
    // Top/bottom seats throw the fold pile vertically toward the centre;
    // side seats throw it horizontally. Pinning the inactive axis to the
    // start coordinate keeps the trajectory straight (no diagonal drift)
    // so the throw direction reads as "toward the table from where I sit"
    // rather than "toward the bank chip". The active-axis fraction is
    // larger for side seats to compensate for the felt being taller than
    // wide on portrait phones — same pixel distance, regardless of seat.
    const isVerticalSeat = displayPos === 'top' || displayPos === 'bottom';
    const destTop = isVerticalSeat
      ? lerpPct(startAnchor.top, '50%', HAND_FOLD_TRAVEL_FRACTION)
      : startAnchor.top;
    const destLeft = isVerticalSeat
      ? startAnchor.left
      : lerpPct(startAnchor.left, '50%', HAND_FOLD_SIDE_TRAVEL_FRACTION);
    const restTransform = `translate(${startAnchor.tx}, ${startAnchor.ty}) scale(${HAND_FOLD_REST_SCALE})`;
    const anim = el.animate(
      [
        {
          offset: 0,
          top: startAnchor.top,
          left: startAnchor.left,
          transform: restTransform,
          opacity: 1,
          easing: 'cubic-bezier(.4,.1,.6,1)',
        },
        {
          offset: flightEnd,
          top: destTop,
          left: destLeft,
          transform: restTransform,
          opacity: 1,
          easing: 'linear',
        },
        {
          offset: restEnd,
          top: destTop,
          left: destLeft,
          transform: restTransform,
          opacity: 1,
          easing: 'cubic-bezier(.4,0,.6,1)',
        },
        {
          offset: 1,
          top: destTop,
          left: destLeft,
          transform: restTransform,
          opacity: 0,
        },
      ],
      {
        duration: HAND_FOLD_TOTAL_MS,
        fill: 'forwards',
      },
    );
    return () => {
      if (anim && typeof anim.cancel === 'function') anim.cancel();
    };
  }, [anchor, startAnchor, displayPos]);
  const isSideSeat = displayPos !== 'top' && displayPos !== 'bottom';
  if (!anchor || !startAnchor) return null;
  return (
    <div
      ref={ref}
      className={styles.foldingOverlay}
      style={{
        top: startAnchor.top,
        left: startAnchor.left,
        transform: `translate(${startAnchor.tx}, ${startAnchor.ty}) scale(${HAND_FOLD_REST_SCALE})`,
      }}
    >
      <FoldCardFan sideSeat={isSideSeat} />
    </div>
  );
}
export const FoldingSeatOverlay = memo(FoldingSeatOverlayImpl);
