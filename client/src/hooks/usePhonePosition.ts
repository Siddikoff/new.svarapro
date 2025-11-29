import React, { useState, useEffect } from 'react';

interface windowSize {
    width: number;
    height: number;
}

export const usePhonePosition = () => {
  const [windowSize, setWindowSize] = useState<windowSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return windowSize.width > windowSize.height?'gorizontal':'vertical';
}

