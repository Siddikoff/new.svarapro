import React, { type CSSProperties,memo } from 'react';

import { BRAND, RADIUS } from '../../../designSystem';
import styles from './Chat.module.css';

type LottieModule = typeof import('lottie-web')['default'];

// Dynamic import so the ~79KB gz lottie-web chunk only loads when the
// user opens the chat sheet and an emoji renders for the first time.
let lottieModulePromise: Promise<LottieModule> | null = null;
function getLottie(): Promise<LottieModule> {
  if (!lottieModulePromise) {
    lottieModulePromise = import('lottie-web').then((m) => (m.default || (m as unknown as LottieModule)));
  }
  return lottieModulePromise;
}

export const CHAT_TEXTS = [
  'Здарова\nБандюганы!',
  'Ха-Ха-Ха!',
  'Спасибо!',
  'Давай, давай!',
  'Респект!',
  'Вау!',
  'Не бойся,\nдерзай!',
  'Удачи!',
  'Ништяк!',
  'Вот это да!',
  'А мне по\nбарабану!',
  'Хорошая игра',
  'Не везет!',
  'Супер!',
  'Извини!',
  'Чую блеф!',
  'Быстрее!',
  'Ля какой\nхитрый!',
  'Блин!',
  'Ва-банк!',
];

// Google Noto Animated Emojis – served as Lottie JSON from fonts.gstatic.com
export const CHAT_EMOJIS = [
  { id: '1f44d', char: '\uD83D\uDC4D' },
  { id: '2764_fe0f', char: '\u2764\uFE0F' },
  { id: '1f602', char: '\uD83D\uDE02' },
  { id: '1f525', char: '\uD83D\uDD25' },
  { id: '1f44f', char: '\uD83D\uDC4F' },
  { id: '1f60e', char: '\uD83D\uDE0E' },
  { id: '1f621', char: '\uD83D\uDE21' },
  { id: '1f62d', char: '\uD83D\uDE2D' },
  { id: '1f389', char: '\uD83C\uDF89' },
  { id: '1f618', char: '\uD83D\uDE18' },
  { id: '1f914', char: '\uD83E\uDD14' },
  { id: '1f634', char: '\uD83D\uDE34' },
  { id: '1f644', char: '\uD83D\uDE44' },
  { id: '1f631', char: '\uD83D\uDE31' },
  { id: '1f923', char: '\uD83E\uDD23' },
  { id: '1f929', char: '\uD83E\uDD29' },
  { id: '1f61c', char: '\uD83D\uDE1C' },
  { id: '1f973', char: '\uD83E\uDD73' },
  { id: '1f607', char: '\uD83D\uDE07' },
  { id: '1f917', char: '\uD83E\uDD17' },
  { id: '1f64f', char: '\uD83D\uDE4F' },
  { id: '1f44c', char: '\uD83D\uDC4C' },
  { id: '1f4af', char: '\uD83D\uDCAF' },
  { id: '1f680', char: '\uD83D\uDE80' },
];

type LottieAnimation = ReturnType<LottieModule['loadAnimation']>;

const LOTTIE_CACHE: Record<string, Promise<unknown> | undefined> = {};
function loadEmojiJson(id: string): Promise<unknown> {
  const cached = LOTTIE_CACHE[id];
  if (cached) return cached;
  const next = fetch('https://fonts.gstatic.com/s/e/notoemoji/latest/' + id + '/lottie.json')
    .then((r) => r.json())
    .catch(() => null);
  LOTTIE_CACHE[id] = next;
  return next;
}

interface LottieEmojiProps {
  emojiId: string;
  fallback: string;
  size?: number;
  loop?: boolean;
}

function LottieEmojiImpl({ emojiId, fallback, size = 32, loop = true }: LottieEmojiProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const animRef = React.useRef<LottieAnimation | null>(null);
  const [hasAnim, setHasAnim] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setHasAnim(false);
    Promise.all([loadEmojiJson(emojiId), getLottie()]).then(([data, lottie]) => {
      if (cancelled || !data || !lottie || !ref.current) return;
      try {
        const anim = lottie.loadAnimation({
          container: ref.current,
          renderer: 'svg',
          loop,
          autoplay: true,
          animationData: data as object,
        });
        animRef.current = anim;
        try {
          anim.setSpeed(1);
        } catch {}
        try {
          anim.play();
        } catch {}
        setHasAnim(true);
      } catch {}
    });
    return () => {
      cancelled = true;
      if (animRef.current) {
        try {
          animRef.current.destroy();
        } catch {}
        animRef.current = null;
      }
    };
  }, [emojiId, loop]);
  return (
    <div className={styles.lottieRoot} style={{ width: size, height: size }}>
      <span
        aria-hidden
        className={styles.lottieFallback}
        style={{
          fontSize: Math.round(size * 0.92),
          opacity: hasAnim ? 0 : 1,
        }}
      >
        {fallback}
      </span>
      <div ref={ref} className={styles.lottieOverlay} style={{ width: size, height: size }} />
    </div>
  );
}
export const LottieEmoji = memo(LottieEmojiImpl);

interface PhraseBubbleButtonProps {
  text: string;
  onClick: () => void;
  background?: string;
  color?: string;
  border?: string;
}

function PhraseBubbleButton({ text, onClick, background, color, border }: PhraseBubbleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={styles.phraseBtn}
      style={{
        background,
        color,
        border: border || 'none',
      }}
    >
      {text}
    </button>
  );
}

type ChatTheme = 'light' | 'dark';
type ChatButtonVariant = 'ghost' | 'soft' | 'blue';

interface ChatButtonProps {
  onClick: () => void;
  bottom?: number;
  theme?: ChatTheme;
  variant?: ChatButtonVariant;
}

function ChatButtonImpl({ onClick, bottom = 76, theme = 'dark', variant = 'ghost' }: ChatButtonProps) {
  const variantStyles: Record<ChatButtonVariant, CSSProperties> = {
    ghost: {
      width: 40,
      height: 34,
      borderRadius: 0,
      background: 'transparent',
      border: 'none',
      color: theme === 'light' ? '#17212b' : BRAND.white,
      boxShadow: 'none',
    },
    soft:
      theme === 'light'
        ? {
            width: 40,
            height: 38,
            borderRadius: RADIUS.lg,
            background: 'linear-gradient(180deg, #ffffff 0%, #d8dde4 100%)',
            border: '1px solid rgba(20,32,51,0.10)',
            color: '#1a2533',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(20,32,51,0.12), 0 4px 12px rgba(20,32,51,0.18)',
          }
        : {
            width: 40,
            height: 38,
            borderRadius: RADIUS.lg,
            background: 'linear-gradient(180deg, #4a4a55 0%, #1a1a20 100%)',
            border: 'none',
            color: BRAND.white,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.45)',
          },
    blue: {
      width: 44,
      height: 38,
      borderRadius: RADIUS.lg,
      background: 'linear-gradient(180deg, #5da2f1 0%, #3d86d8 100%)',
      border: 'none',
      color: BRAND.white,
      boxShadow: '0 10px 22px rgba(25,86,154,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
    },
  };
  const current = variantStyles[variant] || variantStyles.ghost;
  return (
    <button
      onClick={onClick}
      aria-label="chat"
      className={styles.chatBtn}
      style={{
        bottom: bottom + 6,
        ...current,
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={styles.chatBtnSvg}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6 3 H18 A5 5 0 0 1 23 8 V14 A5 5 0 0 1 18 19 H11 L4 23 L7.5 19 H6 A5 5 0 0 1 1 14 V8 A5 5 0 0 1 6 3 Z M6.2 8 H17.8 A1.2 1.2 0 0 1 17.8 10.4 H6.2 A1.2 1.2 0 0 1 6.2 8 Z M6.2 12 H13.8 A1.2 1.2 0 0 1 13.8 14.4 H6.2 A1.2 1.2 0 0 1 6.2 12 Z"
        />
      </svg>
    </button>
  );
}
export const ChatButton = memo(ChatButtonImpl);

export type ChatPickItem =
  | { kind: 'text'; value: string }
  | { kind: 'emoji'; emojiId: string; value: string };

export interface ChatPanelTheme {
  menuColor?: string;
}

export interface ChatPanelProps {
  open: boolean;
  onClose?: () => void;
  onPick: (item: ChatPickItem) => void;
  t: ChatPanelTheme;
}

export function ChatPanel({ open, onClose, onPick, t }: ChatPanelProps) {
  const [tab, setTab] = React.useState<'phrases' | 'emojis'>('phrases');
  const [closing, setClosing] = React.useState(false);
  React.useEffect(() => {
    if (open) setClosing(false);
  }, [open]);
  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose && onClose();
    }, 200);
  };
  if (!open) return null;
  const oled =
    typeof document !== 'undefined' && document.body.getAttribute('data-theme-variant') === 'oled';
  const dark = oled || t.menuColor === BRAND.white;
  let sheetBg: string;
  let chipBg: string;
  let emojiCellBg: string;
  if (oled) {
    sheetBg = '#1c1c1e';
    chipBg = 'linear-gradient(180deg, #2c2c2e 0%, #232325 100%)';
    emojiCellBg = '#2c2c2e';
  } else if (dark) {
    sheetBg = '#1f2a44';
    chipBg = 'linear-gradient(180deg, #2c3a5a 0%, #243047 100%)';
    emojiCellBg = '#2c3a5a';
  } else {
    sheetBg = '#ffffff';
    chipBg = 'linear-gradient(180deg, #f4f7fb 0%, #e8edf4 100%)';
    emojiCellBg = '#f4f7fb';
  }
  const sheetText = dark ? BRAND.white : '#1a2533';
  const accent = BRAND.accent;
  const tabInactiveText = dark ? 'rgba(255,255,255,0.55)' : 'rgba(26,37,51,0.55)';
  const chipBorder = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(26,37,51,0.06)';
  const phraseTextColor = dark ? BRAND.white : '#1a2533';
  return (
    <>
      <div
        onClick={close}
        className={styles.backdrop}
        style={{
          animation: closing
            ? 'svrSheetFade .2s ease-out reverse forwards'
            : 'svrSheetFade .2s ease-out both',
        }}
      />
      <div
        className={styles.sheet}
        style={{
          background: sheetBg,
          color: sheetText,
          animation: closing
            ? 'svrSheetUp .22s cubic-bezier(.32,.72,.36,1) reverse forwards'
            : 'svrSheetUp .26s cubic-bezier(.22,.94,.36,1) both',
        }}
      >
        <div
          aria-hidden
          className={styles.grabber}
          style={{
            background: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)',
          }}
        />
        <div className={styles.tabRow}>
          {([
            { k: 'phrases', label: 'Фразы' },
            { k: 'emojis', label: 'Эмодзи' },
          ] as const).map((it) => {
            const active = tab === it.k;
            return (
              <button
                key={it.k}
                onClick={() => setTab(it.k)}
                className={styles.tabBtn}
                style={{
                  background: active ? accent : 'transparent',
                  color: active ? BRAND.white : tabInactiveText,
                  boxShadow: active ? '0 4px 12px rgba(36,129,204,0.35)' : 'none',
                }}
              >
                {it.label}
              </button>
            );
          })}
        </div>
        <div className={styles.scroll}>
          <div className={styles.tabStack}>
            <div className={styles.tabPane} style={{ visibility: tab === 'phrases' ? 'visible' : 'hidden' }}>
              <div className={styles.phrasesGrid}>
                {CHAT_TEXTS.map((tx) => (
                  <PhraseBubbleButton
                    key={tx}
                    text={tx}
                    background={chipBg}
                    color={phraseTextColor}
                    border={chipBorder}
                    onClick={() => {
                      onPick({ kind: 'text', value: tx });
                      close();
                    }}
                  />
                ))}
              </div>
            </div>
            <div className={styles.tabPane} style={{ visibility: tab === 'emojis' ? 'visible' : 'hidden' }}>
              <div className={styles.emojisGrid}>
                {CHAT_EMOJIS.map((em) => (
                  <button
                    key={em.id}
                    onClick={() => {
                      onPick({ kind: 'emoji', emojiId: em.id, value: em.char });
                      close();
                    }}
                    className={styles.emojiBtn}
                    style={{
                      border: chipBorder,
                      background: emojiCellBg,
                    }}
                  >
                    <span aria-label={em.id} className={styles.emojiChar}>
                      {em.char}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
