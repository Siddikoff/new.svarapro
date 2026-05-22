/**
 * toastStore \u2014 transient user-facing notifications.
 *
 * Used by the WebSocket bridge to surface protocol-level `ERROR` frames
 * and by domain code (deposit/withdraw flows, room actions) to push
 * inline notifications without coupling to a specific UI library.
 *
 * Toasts are auto-dismissed after `duration` ms, but the consumer can
 * also call `dismissToast(id)` directly. Keeping the store tiny (id +
 * tone + text) avoids the "giant store" anti-pattern \u2014 rendering
 * decoration stays in the toast component.
 */
import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** Auto-dismiss timeout in ms. `0` keeps the toast until dismissed. */
  duration: number;
}

export interface ToastInput {
  tone?: ToastTone;
  message: string;
  duration?: number;
}

export interface ToastStoreState {
  toasts: Toast[];
  pushToast: (input: ToastInput) => number;
  dismissToast: (id: number) => void;
  clearToasts: () => void;
}

const DEFAULT_DURATION_MS = 4000;

let nextId = 1;

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  pushToast: ({ tone = 'info', message, duration = DEFAULT_DURATION_MS }) => {
    const id = nextId++;
    const toast: Toast = { id, tone, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    if (duration > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}));
