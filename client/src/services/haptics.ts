import { STORAGE_KEYS } from '../constants/app';
import { getTelegramWebApp } from './telegram';

const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent ?? '');
};

const vibrationDisabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.vibration) === 'off';
  } catch {
    return false;
  }
};

const webVibrate = (pattern: number | number[]): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
};

const telegramHaptics = () => getTelegramWebApp()?.HapticFeedback ?? null;

export const hapticTap = (): void => {
  if (vibrationDisabled()) return;
  const haptics = telegramHaptics();
  let firedTelegram = false;

  if (haptics) {
    try {
      if (typeof haptics.impactOccurred === 'function') {
        haptics.impactOccurred('light');
        firedTelegram = true;
      } else if (typeof haptics.selectionChanged === 'function') {
        haptics.selectionChanged();
        firedTelegram = true;
      }
    } catch {
      // ignore
    }
  }

  // Telegram HapticFeedback often no-ops on Android — also fire navigator.vibrate as a backup.
  if (!firedTelegram || isAndroid()) webVibrate(15);
};

export const hapticSuccess = (): void => {
  if (vibrationDisabled()) return;
  const haptics = telegramHaptics();
  let firedTelegram = false;

  if (haptics?.notificationOccurred) {
    try {
      haptics.notificationOccurred('success');
      firedTelegram = true;
    } catch {
      // ignore
    }
  }

  if (!firedTelegram || isAndroid()) webVibrate([35, 60, 35]);
};
