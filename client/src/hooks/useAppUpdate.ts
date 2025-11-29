import { useEffect, useState } from 'react';

export const useAppUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Проверяем, поддерживает ли браузер Service Worker
    if ('serviceWorker' in navigator) {
      // Слушаем события обновления
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      });

      // Проверяем обновления каждые 5 минут
      const interval = setInterval(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const updateApp = () => {
    setIsUpdating(true);
    // Перезагружаем страницу для применения обновлений
    window.location.reload();
  };

  return { updateAvailable, isUpdating, updateApp };
}; 