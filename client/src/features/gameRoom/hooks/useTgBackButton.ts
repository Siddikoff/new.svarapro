import { useEffect, useRef } from 'react';

/**
 * Wires the Telegram BackButton to a confirm-then-exit handler while the
 * game room is mounted. No-op outside Telegram WebApp.
 *
 * The `onExit` callback is captured into a ref so the effect can run
 * exactly once on mount / unmount. Callers (e.g. `GameRoomHost`) pass
 * a fresh arrow function on every render; if we listed `onExit` in the
 * dep array directly, every parent re-render would run cleanup
 * (`backButton.hide()`) and then the effect (`backButton.show()`)
 * again. On real Telegram clients that flicker swaps the back chevron
 * for the WebApp's default close (X) icon, which is the visible bug
 * reported in the redesign.
 */
export function useTgBackButton(onExit: (() => void) | null | undefined): void {
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

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
        const exit = onExitRef.current;
        if (confirmed && exit) exit();
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
  }, []);
}
