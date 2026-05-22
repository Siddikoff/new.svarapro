import { useEffect } from 'react';

/**
 * Wires the Telegram BackButton to a confirm-then-exit handler while the
 * game room is mounted. No-op outside Telegram WebApp.
 */
export function useTgBackButton(onExit: (() => void) | null | undefined): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const tg = window.Telegram && window.Telegram.WebApp;
    const backButton = tg?.BackButton;
    if (!tg || !backButton) return undefined;
    const handler = (): void => {
      const ask = (cb: (confirmed: boolean) => void): void => {
        if (tg.showConfirm) {
          try {
            tg.showConfirm('Вы действительно хотите выйти из игры?', cb);
            return;
          } catch {
            // fall through to window.confirm
          }
        }
        cb(window.confirm('Вы действительно хотите выйти из игры?'));
      };
      ask((confirmed) => {
        if (confirmed && onExit) onExit();
      });
    };
    try {
      backButton.show && backButton.show();
    } catch {
      // ignore
    }
    try {
      backButton.onClick && backButton.onClick(handler);
    } catch {
      // ignore
    }
    return () => {
      try {
        backButton.offClick && backButton.offClick(handler);
      } catch {
        // ignore
      }
      try {
        backButton.hide && backButton.hide();
      } catch {
        // ignore
      }
    };
  }, [onExit]);
}
