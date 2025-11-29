import { useState, useEffect, useCallback } from 'react';
import { hapticFeedback } from '@telegram-apps/sdk';
import { isTMA } from '@telegram-apps/sdk-react';

export const useHapticFeedback = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const storedValue = localStorage.getItem('hapticEnabled');
    return storedValue !== 'false'; // По умолчанию включено
  });

  useEffect(() => {
    localStorage.setItem('hapticEnabled', String(isEnabled));
  }, [isEnabled]);

  const toggleHaptic = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const triggerImpact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    if (isEnabled && isTMA() && hapticFeedback.impactOccurred.isAvailable()) {
      try {
        hapticFeedback.impactOccurred(style);
      } catch (error) {
        console.error('Error triggering haptic feedback:', error);
      }
    }
  }, [isEnabled]);

  return { isHapticEnabled: isEnabled, toggleHaptic, triggerImpact };
};
