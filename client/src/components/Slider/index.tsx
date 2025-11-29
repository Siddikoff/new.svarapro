import React, { useState, useEffect } from 'react';
import closeIcon from '../../assets/close.png';

interface SliderProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string; // e.g., '25vh', '300px'
  zIndex?: number;
}

export function Slider({ isOpen, onClose, children, height = '25vh', zIndex = 50 }: SliderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    console.log('Slider useEffect - isOpen:', isOpen);
    if (isOpen) {
      setShouldRender(true);
      // Устанавливаем isVisible в false сначала, чтобы панель была внизу
      setIsVisible(false);
      // Затем через небольшую задержку запускаем анимацию появления
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Ждем завершения анимации исчезновения перед размонтированием
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black flex items-end   ${
        isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
      }`}
      style={{ zIndex }}
      onClick={onClose}
    >
      
      {/* Bottom Sheet Panel */}
      <div
        className={`w-full transition-transform duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ 
          height,
          width: 'calc(100% + 4px)', // Делаем на 4px шире экрана
          margin: '0 -2px', // Отрицательный margin в обе стороны
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the panel
      >
        {/* Container with gradient border and rounded corners */}
        <div
          className="relative w-full h-full"
          style={{
            background: 'linear-gradient(180deg, #48454D 0%, rgba(255, 255, 255, 0.3) 50%, #2D2B31 100%)',
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          {/* Inner background */}
          <div
            style={{
              position: 'absolute',
              inset: '1px',
              background: '#2E2B33',
              borderRadius: '19px',
              zIndex: 0,
            }}
          />
          
          {/* Content */}
          <div className="relative z-10 h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}