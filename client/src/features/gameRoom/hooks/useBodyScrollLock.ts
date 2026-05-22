import { useEffect } from 'react';

/**
 * Locks the document scroll while the game room is mounted. Restores the
 * previous overflow/position/top values and scroll offset on unmount so
 * the page doesn't jump.
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const prev = {
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
      bodyPosition: document.body.style.position,
      bodyWidth: document.body.style.width,
      bodyTop: document.body.style.top,
      scrollY: window.scrollY,
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${prev.scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      document.body.style.position = prev.bodyPosition;
      document.body.style.width = prev.bodyWidth;
      document.body.style.top = prev.bodyTop;
      window.scrollTo(0, prev.scrollY);
    };
  }, []);
}
