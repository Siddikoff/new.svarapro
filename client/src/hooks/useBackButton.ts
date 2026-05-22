import { useEffect } from 'react';

import { hideBackButton, showBackButton } from '../services/telegram';

/**
 * Show the Telegram BackButton while `visible` is true and run `onBack`
 * when pressed. Hides automatically on unmount or when `visible` flips
 * to false.
 */
export const useBackButton = (
  visible: boolean,
  onBack: (() => void) | null | undefined,
): void => {
  useEffect(() => {
    if (!visible || typeof onBack !== 'function') {
      hideBackButton();
      return undefined;
    }
    return showBackButton(onBack);
  }, [visible, onBack]);
};
