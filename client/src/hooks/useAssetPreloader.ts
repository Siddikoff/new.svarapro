import { useState, useEffect } from 'react';

// Список всех ассетов, которые нужно предзагрузить
const ASSETS_TO_PRELOAD = [
  // Карты
  '/src/assets/game/7c.png',
  '/src/assets/game/7d.png',
  '/src/assets/game/7h.png',
  '/src/assets/game/7s.png',
  '/src/assets/game/8c.png',
  '/src/assets/game/8d.png',
  '/src/assets/game/8h.png',
  '/src/assets/game/8s.png',
  '/src/assets/game/9c.png',
  '/src/assets/game/9d.png',
  '/src/assets/game/9h.png',
  '/src/assets/game/9s.png',
  '/src/assets/game/10c.png',
  '/src/assets/game/10d.png',
  '/src/assets/game/10h.png',
  '/src/assets/game/10s.png',
  '/src/assets/game/jc.png',
  '/src/assets/game/jd.png',
  '/src/assets/game/jh.png',
  '/src/assets/game/js.png',
  '/src/assets/game/qc.png',
  '/src/assets/game/qd.png',
  '/src/assets/game/qh.png',
  '/src/assets/game/qs.png',
  '/src/assets/game/kc.png',
  '/src/assets/game/kd.png',
  '/src/assets/game/kh.png',
  '/src/assets/game/ks.png',
  '/src/assets/game/ac.png',
  '/src/assets/game/ad.png',
  '/src/assets/game/ah.png',
  '/src/assets/game/as.png',
  '/src/assets/game/back.png',
  
  // Другие ассеты
  '/src/assets/game/background.jpg',
  '/src/assets/game/table.jpg',
  '/src/assets/game/coin.png',
  '/src/assets/game/star.png',
  '/src/assets/game/chatButton.png',
  '/src/assets/game/sitdown.png',
  '/src/assets/game/invite.png',
  '/src/assets/game/menu.svg',
  '/src/assets/game/exit.svg',
  '/src/assets/game/look.svg',
  '/src/assets/game/pass.svg',
  '/src/assets/game/raise.svg',
  '/src/assets/game/volume.svg',
  '/src/assets/game/vibro.svg',
  
  // Звуки
  '/src/assets/game/fold.mp3',
  '/src/assets/game/turn.mp3',
  '/src/assets/game/win.mp3',
];

export const useAssetPreloader = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loaded = 0;
    let failed = 0;

    const preloadAsset = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const isImage = /\.(png|jpg|jpeg|gif|svg)$/i.test(src);
        const isAudio = /\.(mp3|wav|ogg)$/i.test(src);

        if (isImage) {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          img.src = src;
        } else if (isAudio) {
          const audio = new Audio();
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
          audio.src = src;
        } else {
          resolve(); // Skip unknown file types
        }
      });
    };

    const preloadAllAssets = async () => {
      try {
        const promises = ASSETS_TO_PRELOAD.map(asset => 
          preloadAsset(asset).catch(error => {
            console.warn(`Failed to preload asset: ${asset}`, error);
            failed++;
            return null; // Continue with other assets
          })
        );

        await Promise.allSettled(promises);
        
        if (isMounted) {
          loaded = ASSETS_TO_PRELOAD.length - failed;
          setLoadedCount(loaded);
          setIsLoading(false);
          
          if (failed > 0) {
            console.warn(`${failed} assets failed to load, but continuing...`);
          }
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to preload assets');
          setIsLoading(false);
        }
      }
    };

    preloadAllAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isLoading,
    loadedCount,
    totalCount: ASSETS_TO_PRELOAD.length,
    error,
    progress: ASSETS_TO_PRELOAD.length > 0 ? (loadedCount / ASSETS_TO_PRELOAD.length) * 100 : 0,
  };
};