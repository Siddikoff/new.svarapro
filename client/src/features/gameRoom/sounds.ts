// Card-deal and reaction sound helpers.
//
// Card sound: load the user-supplied mp3 once at module level, then decode
// lazily per-AudioContext and reuse the decoded buffer for every play.
// Reaction sound: synthesised on the fly (no asset).

const CARD_SOUND_URL = '/sounds/card-deal.mp3';
const CARD_OPEN_SOUND_URL = '/sounds/card-open.mp3';
const POKER_CHIP_SOUND_URL = '/sounds/poker-chip.mp3';
const SVARA_SOUND_URL = '/sounds/svara.mp3';

type ArrayBufferLoader = () => Promise<ArrayBuffer | null>;

let cardSoundArrBufPromise: Promise<ArrayBuffer | null> | null = null;
let cardOpenSoundArrBufPromise: Promise<ArrayBuffer | null> | null = null;
let pokerChipSoundArrBufPromise: Promise<ArrayBuffer | null> | null = null;
let svaraSoundArrBufPromise: Promise<ArrayBuffer | null> | null = null;

const loadCardSoundArrBuf: ArrayBufferLoader = () => {
  if (!cardSoundArrBufPromise) {
    cardSoundArrBufPromise = fetch(CARD_SOUND_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
  }
  return cardSoundArrBufPromise;
};
const loadCardOpenSoundArrBuf: ArrayBufferLoader = () => {
  if (!cardOpenSoundArrBufPromise) {
    cardOpenSoundArrBufPromise = fetch(CARD_OPEN_SOUND_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
  }
  return cardOpenSoundArrBufPromise;
};
const loadPokerChipSoundArrBuf: ArrayBufferLoader = () => {
  if (!pokerChipSoundArrBufPromise) {
    pokerChipSoundArrBufPromise = fetch(POKER_CHIP_SOUND_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
  }
  return pokerChipSoundArrBufPromise;
};
const loadSvaraSoundArrBuf: ArrayBufferLoader = () => {
  if (!svaraSoundArrBufPromise) {
    svaraSoundArrBufPromise = fetch(SVARA_SOUND_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
  }
  return svaraSoundArrBufPromise;
};

// Kick off the fetch as soon as the module evaluates so the buffer is
// already in memory by the time the first card needs it.
if (typeof window !== 'undefined') {
  try {
    loadCardSoundArrBuf();
    loadCardOpenSoundArrBuf();
    loadPokerChipSoundArrBuf();
    loadSvaraSoundArrBuf();
  } catch {
    // ignore
  }
}

const cardSoundDecodeCache = new WeakMap<AudioContext, AudioBuffer>();
const cardOpenSoundDecodeCache = new WeakMap<AudioContext, AudioBuffer>();
const pokerChipSoundDecodeCache = new WeakMap<AudioContext, AudioBuffer>();
const svaraSoundDecodeCache = new WeakMap<AudioContext, AudioBuffer>();

const decodeSoundBuffer = async (
  ctx: AudioContext,
  loadArrBuf: ArrayBufferLoader,
  cache: WeakMap<AudioContext, AudioBuffer>,
): Promise<AudioBuffer | null> => {
  const cached = cache.get(ctx);
  if (cached) return cached;
  const arr = await loadArrBuf();
  if (!arr) return null;
  let buf: AudioBuffer | null = null;
  try {
    buf = await ctx.decodeAudioData(arr.slice(0));
  } catch {
    buf = null;
  }
  if (buf) cache.set(ctx, buf);
  return buf;
};

const getCardSoundBuffer = async (ctx: AudioContext): Promise<AudioBuffer | null> =>
  decodeSoundBuffer(ctx, loadCardSoundArrBuf, cardSoundDecodeCache);
const getCardOpenSoundBuffer = async (ctx: AudioContext): Promise<AudioBuffer | null> =>
  decodeSoundBuffer(ctx, loadCardOpenSoundArrBuf, cardOpenSoundDecodeCache);
const getPokerChipSoundBuffer = async (ctx: AudioContext): Promise<AudioBuffer | null> =>
  decodeSoundBuffer(ctx, loadPokerChipSoundArrBuf, pokerChipSoundDecodeCache);
const getSvaraSoundBuffer = async (ctx: AudioContext): Promise<AudioBuffer | null> =>
  decodeSoundBuffer(ctx, loadSvaraSoundArrBuf, svaraSoundDecodeCache);

export const playCardFlickSound = (ctx: AudioContext | null, variation: number = 0): void => {
  if (!ctx) return;
  getCardSoundBuffer(ctx)
    .then((buf) => {
      if (!buf) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 1 + ((variation % 3) - 1) * 0.04;
        const gain = ctx.createGain();
        gain.gain.value = 0.85;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch {
        // ignore
      }
    })
    .catch(() => {});
};

export const playCardOpenSound = (ctx: AudioContext | null): void => {
  if (!ctx) return;
  getCardOpenSoundBuffer(ctx)
    .then((buf) => {
      if (!buf) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 0.42;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch {
        // ignore
      }
    })
    .catch(() => {});
};

// Poker-chip clink — played when an ante chip lands at the pot pile.
export const playPokerChipSound = (ctx: AudioContext | null, variation: number = 0): void => {
  if (!ctx) return;
  getPokerChipSoundBuffer(ctx)
    .then((buf) => {
      if (!buf) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 1 + ((variation % 3) - 1) * 0.05;
        const gain = ctx.createGain();
        gain.gain.value = 0.55;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch {
        // ignore
      }
    })
    .catch(() => {});
};

// Turn-start notification: warm major chord (C-E-G).
export const playTurnStartSound = (ctx: AudioContext): void => {
  const now = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
  for (const freq of freqs) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + 0.65);
  }
};

// Svara announce stinger — a "buy success" chime sample. Gain 0.45 keeps
// the sustained two-second sample in the same perceived range as the
// shorter percussive game sounds (card-open ~0.42, poker-chip ~0.55).
export const playSvaraAnnounceSound = (ctx: AudioContext | null): void => {
  if (!ctx) return;
  getSvaraSoundBuffer(ctx)
    .then((buf) => {
      if (!buf) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 0.45;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch {
        // ignore
      }
    })
    .catch(() => {});
};

// Winner fanfare: ascending arpeggio C-E-G-C with shimmer harmonics.
export const playWinnerSound = (ctx: AudioContext): void => {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const t = now + i * 0.1;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.55);
    // Shimmer harmonic
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2, t);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o2.connect(g2); g2.connect(ctx.destination);
    o2.start(t); o2.stop(t + 0.4);
  });
};

export type ReactionBubbleKind = 'emoji' | 'sticker';

// Reaction sound: bubble pop (quick rising chirp ~0.18s).
export const playBubbleBlip = (ctx: AudioContext, kind: ReactionBubbleKind): void => {
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  const start = kind === 'emoji' ? 220 : 160;
  const end = kind === 'emoji' ? 1180 : 880;
  o.frequency.setValueAtTime(start, now);
  o.frequency.exponentialRampToValueAtTime(end, now + 0.06);
  o.frequency.exponentialRampToValueAtTime(end * 0.55, now + 0.13);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.36, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.2);
};
