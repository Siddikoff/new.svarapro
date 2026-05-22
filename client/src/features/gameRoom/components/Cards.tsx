import { type CSSProperties,memo, useLayoutEffect, useRef } from 'react';

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
function SeatCardImpl({ pos, cardIndex, delayMs }: SeatCardProps) {
  const sideKey = pos.includes('right') ? 'left' : 'right';
  const safe = pos.replace('-', '_');
  return (
    <div
      className={styles.seatCard}
      style={{
        [sideKey]: -14,
        zIndex: 10 + cardIndex,
        animation: `svrDeal_${safe}_${cardIndex} ${DEAL_DURATION_MS}ms cubic-bezier(.22,.94,.36,1) ${delayMs}ms both`,
      }}
    />
  );
}
export const SeatCard = memo(SeatCardImpl);

interface CenterDeckProps {
  totalDeals: number;
}

// Stack of card-backs at the felt center; fades out once all seats are dealt.
function CenterDeckImpl({ totalDeals }: CenterDeckProps) {
  const dealTotalMs = (totalDeals - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS;
  return (
    <div
      className={styles.centerDeck}
      style={{
        animation: `svrDeckFade 320ms cubic-bezier(.22,.94,.36,1) ${dealTotalMs - 80}ms forwards`,
      }}
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

function FoldCardFan() {
  const wrapperWidth = HAND_CARD_W + FOLD_PILE[2].x * 2;
  const wrapperHeight = HAND_CARD_H;
  return (
    <div className={styles.foldFan} style={{ width: wrapperWidth, height: wrapperHeight }}>
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
  const startAnchor = FOLD_START_ANCHORS[displayPos] ?? anchor;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor || !startAnchor) return undefined;
    const flightEnd = HAND_FOLD_FLIGHT_MS / HAND_FOLD_TOTAL_MS;
    const restEnd = (HAND_FOLD_FLIGHT_MS + HAND_FOLD_REST_MS) / HAND_FOLD_TOTAL_MS;
    const destTop = lerpPct(startAnchor.top, '50%', HAND_FOLD_TRAVEL_FRACTION);
    const destLeft = lerpPct(startAnchor.left, '50%', HAND_FOLD_TRAVEL_FRACTION);
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
  }, [anchor, startAnchor]);
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
      <FoldCardFan />
    </div>
  );
}
export const FoldingSeatOverlay = memo(FoldingSeatOverlayImpl);
