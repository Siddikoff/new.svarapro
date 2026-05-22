import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { playBubbleBlip, type ReactionBubbleKind } from '../sounds';

export type ChatReactionKind = 'text' | 'emoji';

export interface ChatReactionItem {
  kind: ChatReactionKind;
  value?: string;
  emojiId?: string;
}

export interface ChatReactionEntry {
  id: number;
  kind: ChatReactionKind;
  value?: string;
  emojiId?: string;
}

export type ChatReactionsMap = Record<string | number, ChatReactionEntry>;

export interface ChatAudio {
  ensureCtx: () => AudioContext | null;
  soundRef: React.MutableRefObject<boolean>;
}

export interface UseChatReactionsResult {
  reactions: ChatReactionsMap;
  showReaction: (seatId: string | number | null | undefined, item: ChatReactionItem) => void;
  audio: ChatAudio;
}

type AudioContextCtor = new (contextOptions?: AudioContextOptions) => AudioContext;

/**
 * Manages the transient per-seat chat reaction bubbles + the shared
 * WebAudio context used to play their blip sounds.
 */
export function useChatReactions(soundEnabled: boolean): UseChatReactionsResult {
  const [reactions, setReactions] = useState<ChatReactionsMap>({});
  const reactionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const reactionId = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundRef = useRef<boolean>(soundEnabled);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const Ctx: AudioContextCtor | undefined = win.AudioContext || win.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new Ctx();
      } catch {
        return null;
      }
    }
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      try {
        ctx.resume();
      } catch {
        // ignore
      }
    }
    return ctx;
  }, []);

  const playReactionSound = useCallback(
    (kind: ChatReactionKind): void => {
      if (!soundRef.current) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      try {
        const bubbleKind: ReactionBubbleKind = kind === 'emoji' ? 'emoji' : 'sticker';
        playBubbleBlip(ctx, bubbleKind);
      } catch {
        // ignore
      }
    },
    [ensureCtx],
  );

  const showReaction = useCallback(
    (seatId: string | number | null | undefined, item: ChatReactionItem): void => {
      if (seatId == null) return;
      const id = ++reactionId.current;
      playReactionSound(item.kind);
      setReactions((prev) => ({
        ...prev,
        [seatId]: { id, kind: item.kind, value: item.value, emojiId: item.emojiId },
      }));
      const key = String(seatId);
      const old = reactionTimers.current[key];
      if (old) clearTimeout(old);
      reactionTimers.current[key] = setTimeout(() => {
        setReactions((prev) => {
          if (!prev[seatId] || prev[seatId].id !== id) return prev;
          const next = { ...prev };
          delete next[seatId];
          return next;
        });
        delete reactionTimers.current[key];
      }, 2500);
    },
    [playReactionSound],
  );

  useEffect(
    () => () => {
      Object.values(reactionTimers.current).forEach((tm) => clearTimeout(tm));
      // Release the shared WebAudio context. Browsers cap the total number
      // of live AudioContexts per page, so leaving one behind on every
      // GameRoom mount would eventually trip the limit.
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) {
        ctx.close().catch(() => {
          // ignore — context may already be closed
        });
      }
    },
    [],
  );

  const audio = useMemo<ChatAudio>(() => ({ ensureCtx, soundRef }), [ensureCtx]);

  return { reactions, showReaction, audio };
}
