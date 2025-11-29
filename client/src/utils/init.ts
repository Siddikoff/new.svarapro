import { init, backButton, expandViewport, swipeBehavior, isTMA } from '@telegram-apps/sdk-react';

let isInitialized = false;

export async function initTelegramSdk(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Проверяем наличие Telegram WebApp
  if (!window.Telegram?.WebApp) {
    console.error('Telegram WebApp is not available. Ensure the app is running in Telegram.');
    throw new Error('Telegram WebApp is not available');
  }

  if (!isTMA()) {
    console.warn('Not running in Telegram Mini App environment (isTMA returned false). Skipping SDK initialization.');
    throw new Error('Not in Telegram Mini App environment');
  }

  try {
    await init();

    await expandViewport();

    if (backButton.isSupported()) {
      await backButton.mount();
    } else {
      console.warn('BackButton is not supported in this environment');
    }

    await swipeBehavior.mount();
    swipeBehavior.disableVertical();

    isInitialized = true;
  } catch (e) {
    console.error('Telegram SDK init error:', e);
    isInitialized = false;
    throw e;
  }
}
