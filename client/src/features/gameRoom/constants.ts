// Module-level data, layout maps and pure math helpers for GameRoom.
//
// Everything here is framework-agnostic (no React, no JSX).  Components that
// need any of these values import them from this single module so the main
// GameRoom file stays focused on orchestration.

import type { ThemeName } from '../../constants/app';
import { BRAND } from '../../designSystem';

export interface BaseColors {
  feltOuter: string;
  green: string;
  red: string;
  blue: string;
}

export const C: BaseColors = {
  feltOuter: 'radial-gradient(ellipse at 50% 50%, #6a4934 0%, #4a321f 28%, #322114 56%, #1d110a 100%)',
  green: '#4dcd5e',
  red: '#e23b3b',
  blue: '#2481cc',
};

export interface TablePreset {
  label: string;
  swatch: string;
  feltInner: string;
  // Optional rail override. When set, the table's outer rail uses this
  // colour/gradient instead of the default `C.feltOuter` (brown).
  feltOuter?: string;
}
export type TablePresetName = 'green' | 'burgundy' | 'cyan';

export const TABLE_PRESETS: Record<TablePresetName, TablePreset> = {
  green: {
    label: 'Зелёный',
    swatch: 'linear-gradient(180deg, #2a7b3e 0%, #154b22 100%)',
    feltInner: 'radial-gradient(ellipse at 50% 38%, #2c7a3c 0%, #266a32 15%, #1f5a2a 30%, #194d24 45%, #144020 62%, #0e3318 78%, #08260f 100%)',
  },
  burgundy: {
    label: 'Бордовый',
    swatch: 'linear-gradient(180deg, #82303f 0%, #4f1220 100%)',
    feltInner: 'radial-gradient(ellipse at 50% 38%, #832c40 0%, #6a2034 15%, #54172a 30%, #421222 45%, #340f1c 62%, #260a15 78%, #170610 100%)',
  },
  cyan: {
    label: 'Голубой',
    swatch: 'linear-gradient(180deg, #4f9bb1 0%, #2c6a7e 100%)',
    feltInner: 'radial-gradient(ellipse at 50% 38%, #4ea0b6 0%, #3e8a9d 15%, #327688 30%, #266275 45%, #1d5063 62%, '
      + '#143f50 78%, #0d2f3e 100%)',
  },
};

export interface RoomThemeColors {
  bg: string;
  bgSoft: string;
  text: string;
  textDim: string;
  vignette: string;
  noiseOpacity: number;
  noiseBlend: import('react').CSSProperties['mixBlendMode'];
  menuColor: string;
  chatBg: string;
  chatColor: string;
}

export function getThemeColors(theme: ThemeName): RoomThemeColors {
  if (theme === 'light') {
    return {
      bg: 'radial-gradient(ellipse at 50% 30%, #d6dae0 0%, #bcc2ca 54%, #949ca7 100%)',
      bgSoft: '#f2f3f5',
      text: '#17212b',
      textDim: 'rgba(23,33,43,0.7)',
      vignette:
        'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0) 48%, rgba(60,72,90,0.18) 100%)',
      noiseOpacity: 0.14,
      noiseBlend: 'multiply',
      menuColor: '#17212b',
      chatBg: BRAND.white,
      chatColor: '#17212b',
    };
  }
  return {
    bg: '#2c2c30',
    bgSoft: '#2a2a2c',
    text: BRAND.white,
    textDim: 'rgba(255,255,255,0.85)',
    vignette: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.42) 100%)',
    noiseOpacity: 0.18,
    noiseBlend: 'soft-light',
    menuColor: BRAND.white,
    chatBg: '#2a2a2c',
    chatColor: BRAND.white,
  };
}

export type SeatAnchorPos =
  | 'top'
  | 'left-up'
  | 'right-up'
  | 'left-center'
  | 'right-center'
  | 'left-down'
  | 'right-down'
  | 'bottom';

export interface SeatActiveBet {
  label: string;
  amount: number;
}

export interface SeatDefinition {
  id: number;
  name: string;
  stack: string;
  photo: number;
  pos: SeatAnchorPos;
  dealer?: boolean;
  me?: boolean;
  timer?: number;
  activeBet?: SeatActiveBet;
}

// Positional placeholders only — no fake usernames/balances. Real player
// data (me-seat + other seats) is overlaid in GameRoom from authStore and
// the WebSocket-driven game store.
export const SEATS_DEFAULT: SeatDefinition[] = [
  { id: 1, name: '', stack: '', photo: 1, pos: 'top' },
  { id: 2, name: '', stack: '', photo: 12, pos: 'left-up' },
  { id: 3, name: '', stack: '', photo: 33, pos: 'right-up' },
  { id: 4, name: '', stack: '', photo: 13, pos: 'left-down' },
  { id: 5, name: '', stack: '', photo: 8, pos: 'right-down' },
  { id: 6, name: '', stack: '', photo: 7, pos: 'bottom', me: true },
];

export const AVATAR = 58;

// All anchors use only top+left (and translate offsets via tx/ty). Keeping a
// single coordinate system means we can CSS-transition between any two
// anchors when a spectator sits down and the table rotates so their seat
// ends up at the bottom.
export interface AnchorPosition {
  top: string;
  left: string;
  tx: string;
  ty: string;
}

export const ANCHORS: Record<SeatAnchorPos, AnchorPosition> = {
  top:           { top: '0%',   left: '50%',  tx: '-50%', ty: '-22%' },
  'left-up':     { top: '33%',  left: '0%',   tx: '-20%', ty: '-27%' },
  'right-up':    { top: '33%',  left: '100%', tx: '-80%', ty: '-27%' },
  // Side-centre anchors are used by the 3- and 4-seat layouts so the
  // remaining seats sit symmetrically across the felt instead of at the
  // up/down corners.
  'left-center':  { top: '50%',  left: '0%',   tx: '-20%', ty: '-50%' },
  'right-center': { top: '50%',  left: '100%', tx: '-80%', ty: '-50%' },
  'left-down':   { top: '67%',  left: '0%',   tx: '-20%', ty: '-27%' },
  'right-down':  { top: '67%',  left: '100%', tx: '-80%', ty: '-27%' },
  bottom:        { top: '100%', left: '50%',  tx: '-50%', ty: '-50%' },
};

// Duration of the "chain rotation" that plays when a spectator takes a side
// seat: their seat slides down to the bottom while all other players slide
// one step around the oval.
export const SEAT_ROTATE_MS = 500;

// Polar coordinates for each anchor relative to the table centre (50%, 50%).
// `theta` is degrees clockwise from straight up; `r` is distance from centre
// in container-%.  Cardinal anchors sit on the inscribed circle (r=50); the
// diagonal anchors are slightly further out because the v9 layout pins them
// to the bounding-rectangle corners.  We use these to animate seats around
// the *oval* edge of the table instead of letting CSS interpolate a straight
// line that cuts across the felt.
export interface PolarCoordinate {
  theta: number;
  r: number;
}

export const SEAT_POLAR: Record<SeatAnchorPos, PolarCoordinate> = {
  top:           { theta: 0,     r: 50    },
  'right-up':    { theta: 71.2,  r: 52.81 },
  'right-center':{ theta: 90,    r: 50    },
  'right-down':  { theta: 108.8, r: 52.81 },
  bottom:        { theta: 180,   r: 50    },
  'left-down':   { theta: 251.2, r: 52.81 },
  'left-center': { theta: 270,   r: 50    },
  'left-up':     { theta: 288.8, r: 52.81 },
};

// Convert (theta, r) polar coords back to (top%, left%).
export function polarToCoords(
  thetaDeg: number,
  r: number,
): { top: number; left: number } {
  const rad = (thetaDeg * Math.PI) / 180;
  return {
    top: 50 - r * Math.cos(rad),
    left: 50 + r * Math.sin(rad),
  };
}

// Pick the signed shortest-arc span (in degrees) between two angles.  Ties
// (|span| == 180) default to CCW (negative) so the bottom↔top sweep in 2/3
// seat layouts curves through the side of the oval, not over the felt.
export function shortArc(fromDeg: number, toDeg: number): number {
  let span = toDeg - fromDeg;
  if (span > 180) span -= 360;
  else if (span < -180) span += 360;
  else if (span === 180) span = -180;
  return span;
}

function _pctNum(s: number | string): number {
  return typeof s === 'number' ? s : parseFloat(s);
}
export function lerpPct(a: number | string, b: number | string, t: number): string {
  return `${(_pctNum(a) + (_pctNum(b) - _pctNum(a)) * t).toFixed(2)}%`;
}

// Clockwise rotation order per table size.  In the 6-seat layout the global
// DEAL_ORDER doubles as the rotation order; for smaller tables we use the
// layout-specific clockwise list so chain rotation always slides seats one
// step around the felt regardless of table size.
export const LAYOUT_DEAL_ORDER: Record<number, SeatAnchorPos[]> = {
  2: ['top', 'bottom'],
  3: ['top', 'bottom', 'left-center'],
  4: ['top', 'right-center', 'bottom', 'left-center'],
  5: ['top', 'right-up', 'bottom', 'left-down', 'left-up'],
};

// For tables with fewer than 6 seats we pick a subset of the default 6 seats
// and reassign them to the layout-specific anchor positions above.  The me
// seat (id=6) always lands at 'bottom'.  Order is clockwise from 'top' so it
// also doubles as the iteration order used by `emptyPositionsBase` (the last
// few entries become the empty seats when a room is under-filled).
export interface LayoutSeatEntry {
  id: number;
  pos: SeatAnchorPos;
}

export const LAYOUT_SEAT_MAP: Record<number, LayoutSeatEntry[]> = {
  2: [
    { id: 1, pos: 'top' },
    { id: 6, pos: 'bottom' },
  ],
  3: [
    { id: 1, pos: 'top' },
    { id: 6, pos: 'bottom' },
    { id: 2, pos: 'left-center' },
  ],
  4: [
    { id: 1, pos: 'top' },
    { id: 3, pos: 'right-center' },
    { id: 6, pos: 'bottom' },
    { id: 2, pos: 'left-center' },
  ],
  5: [
    { id: 1, pos: 'top' },
    { id: 3, pos: 'right-up' },
    { id: 6, pos: 'bottom' },
    { id: 4, pos: 'left-down' },
    { id: 2, pos: 'left-up' },
  ],
};

// Each card originates at the centre deck. The values below are the offset
// from the seat's docked card position back to the felt centre, so a fresh
// card starts visually sitting on top of the deck and then flies to its
// owner. Lift-off is driven by the keyframe (see DEAL_KEYFRAMES below).
export interface DealOrigin {
  x: number;
  y: number;
}

export const DEAL_FROM: Record<SeatAnchorPos, DealOrigin> = {
  top:           { x: 0,    y: 200 },
  'right-up':    { x: -130, y: 90  },
  'right-center':{ x: -130, y: 0   },
  'right-down':  { x: -130, y: -90 },
  bottom:        { x: 0,    y: -200 },
  'left-down':   { x: 130,  y: -90 },
  'left-center': { x: 130,  y: 0   },
  'left-up':     { x: 130,  y: 90  },
};

// Clockwise dealing order, starting from the top seat.
export const DEAL_ORDER: SeatAnchorPos[] = [
  'top',
  'right-up',
  'right-down',
  'bottom',
  'left-down',
  'left-up',
];
export const DEAL_INDEX: Record<SeatAnchorPos, number> = DEAL_ORDER.reduce(
  (acc, p, i) => {
    acc[p] = i;
    return acc;
  },
  {} as Record<SeatAnchorPos, number>,
);

// Each player gets 3 cards; round-robin order means card N for every seat
// is dealt before card N+1 starts.
export interface CardOffset {
  x: number;
  y: number;
  r: number;
}

export const CARD_OFFSETS: CardOffset[] = [
  { x: -4, y: 0, r: -6 },
  { x: 0, y: 0, r: 0 },
  { x: 4, y: 0, r: 6 },
];
export const CARDS_PER_SEAT = CARD_OFFSETS.length;
export const DEAL_STAGGER_MS = 340;
export const DEAL_DURATION_MS = 720;
export const TOTAL_DEALS = CARDS_PER_SEAT * DEAL_ORDER.length;
export const DEAL_TOTAL_MS = (TOTAL_DEALS - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS;

// Wait this long after entering the room before the dealer drops the deck
// and starts dealing.
export const DEAL_START_DELAY_MS = 3000;

// Ante chip toss animation timings (must mirror AnteOverlay.module.css).
// Each occupied seat tosses one chip toward the pot; chips are staggered by
// `ANTE_CHIP_STAGGER_MS` and each chip's flight lasts `ANTE_CHIP_DURATION_MS`.
// `ANTE_TO_DEAL_GAP_MS` is a short breath between the last chip landing and
// the deck dropping in, so the two animations no longer overlap.
export const ANTE_CHIP_DURATION_MS = 1100;
export const ANTE_CHIP_STAGGER_MS = 80;
export const ANTE_TO_DEAL_GAP_MS = 200;

// Total time from "ante starts" to "all chips have landed + breath". Used by
// GameRoom to gate the deck-reveal / card-deal animations so they only kick
// off after every chip is on the felt.
export function getAnteTotalMs(occupiedSeatCount: number): number {
  if (occupiedSeatCount <= 0) return 0;
  return (
    (occupiedSeatCount - 1) * ANTE_CHIP_STAGGER_MS
    + ANTE_CHIP_DURATION_MS
    + ANTE_TO_DEAL_GAP_MS
  );
}

// "Открыть" reveal animation: how long it takes the 3-card fan above the
// me-seat to flip from rubashka to face, plus a small entry delay so the
// hand can fade/scale in before the flip kicks off.
export const HAND_FLIP_DURATION_MS = 560;
export const HAND_ENTER_DURATION_MS = 220;

// "Пас" fold animation lifecycle:
//   1. flight — a small face-down pile translates from above the player's
//      avatar (see FOLD_START_ANCHORS) toward the felt centre. The pile
//      is a constant `HAND_FOLD_REST_SCALE` size throughout — no shrink-
//      during-flight, no 3D flip — so the cards never appear to change
//      size. The open hand simply vanishes the moment the fold starts
//      and the smaller closed pile appears in its place.
//   2. rest  — cards lie face-down at the destination for a beat so the
//      player (and table-mates) can see the fold happened.
//   3. fade  — cards fade out and the overlay unmounts.
// All three phases run in a single Web Animations API keyframe sequence.
//
// Timing notes: flight is intentionally short (~200ms) so the toss reads
// as a quick discard rather than the pile sliding across the felt; rest
// holds for 1s so the player (and table-mates) can see where it
// landed; fade is brief.
export const HAND_FOLD_FLIGHT_MS = 200;
export const HAND_FOLD_REST_MS = 1000;
export const HAND_FOLD_FADE_MS = 250;
export const HAND_FOLD_TOTAL_MS =
  HAND_FOLD_FLIGHT_MS + HAND_FOLD_REST_MS + HAND_FOLD_FADE_MS;
// Fraction of the way from the *fold start anchor* (not the seat anchor)
// to the felt centre (50%, 50%) that the fold travels to. 0 = stays
// where the open hand was, 1 = lands on the deck. We use a small value
// so the discard lands close to the folding player (right next to their
// seat) rather than out in the middle of the table.
export const HAND_FOLD_TRAVEL_FRACTION = 0.18;
// Constant scale of the folding card pile. The me-seat's open hand is
// 60×84 px; scaling to 0.48 lands at ~29×40 px — a compact face-down
// discard pile that reads as "the player tossed their cards" without
// crowding the felt next to the seat.
export const HAND_FOLD_REST_SCALE = 0.48;
// Per-seat starting position for the fold overlay. Unlike `ANCHORS`,
// which pins each seat's centre, these anchor the *open hand's actual
// visual position* — i.e. above the avatar for the bottom seat — so the
// fold appears to start from where the cards were, not from behind the
// player's photo. Missing entries fall back to the seat anchor; for now
// only the bottom (me-) seat is populated because that's the only seat
// that can fold without backend wiring.
export const FOLD_START_ANCHORS: Partial<Record<SeatAnchorPos, AnchorPosition>> = {
  bottom: { top: '82%', left: '50%', tx: '-50%', ty: '-50%' },
};

// Placeholder "round end" delay used by the mid-deal join flow: spectator
// clicks a seat during dealing, sits there dimmed with "Ждём следующий раунд",
// and after this many ms the chain rotation kicks in to slide them to bottom.
export const ROUND_END_MS = 2000;

// Generate one @keyframes block per (seat, card-index) pair. Each card:
//   1. starts hidden on top of the deck (same scale, no rotation),
//   2. lifts a few pixels up off the deck (so the eye reads it as the
//      topmost card being drawn),
//   3. then flies to its resting slot in the seat's fan with rotation.
export const DEAL_KEYFRAMES: string = (Object.keys(DEAL_FROM) as SeatAnchorPos[])
  .map((pos) => {
    const from = DEAL_FROM[pos];
    const safe = pos.replace('-', '_');
    return CARD_OFFSETS.map(
      (off, i) =>
        `@keyframes svrDeal_${safe}_${i} {
      0%   { transform: translate3d(${from.x}px, ${from.y}px, 0) rotate(0deg) scale(1); opacity: 0 }
      6%   { transform: translate3d(${from.x}px, ${from.y - 8}px, 0) rotate(0deg) scale(1); opacity: 1 }
      100% { transform: translate3d(${off.x}px, ${off.y}px, 0) rotate(${off.r}deg) scale(1); opacity: 1 }
    }`,
    ).join('\n');
  })
  .join('\n');
