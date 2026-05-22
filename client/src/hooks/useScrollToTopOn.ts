import { DependencyList, useEffect } from 'react';

/**
 * Scrolls the document to the top every time `dependencies` change.
 *
 * Used when navigating between screens so the user never lands halfway down
 * the previous screen's scroll position.
 */
export const useScrollToTopOn = (dependencies: DependencyList): void => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.scrollTo(0, 0);
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
