import { backButton, isTMA } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

export const useAppBackButton = (isVisible: boolean, handler: () => void) => {
  useEffect(() => {
    // Добавим проверку на isVisible, чтобы не пытаться работать с backButton, если он не нужен
    if (!isVisible) return;

    if (!isTMA()) {
      console.warn('Not in Telegram environment. BackButton will not be used.');
      return;
    }

    if (!window.Telegram?.WebApp) {
      console.warn('Telegram WebApp is not available. BackButton will not be used.');
      return;
    }

    try {
      if (!backButton.isSupported()) {
        console.warn('BackButton is not supported in this environment');
        return;
      }

      backButton.show();
      backButton.onClick(handler);

      return () => {
        try {
          backButton.offClick(handler);
          backButton.hide();
        } catch (e) {
          console.error('Error cleaning up BackButton handler:', e);
        }
      };
    } catch (e) {
      console.error('Error managing BackButton:', e);
    }
  }, [isVisible, handler]);
};
