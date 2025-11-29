import { CSSProperties, useEffect, useState } from 'react';
import './LoadingPage.css';

// Добавляем импорт логотипа (если используете vite)
import mainLogo from '@/assets/main_logo.png'; // или правильный путь к вашему изображению

export function LoadingPage({ isLoading }: { isLoading: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoading && !isVisible) return null;

  const containerStyle: CSSProperties = {
    opacity: isVisible && isLoading ? 1 : 0,
    transition: 'opacity 300ms ease-in-out',
  };

  return (
    <div className="loading-container" style={containerStyle}>
      {/* Main Logo - теперь с явным указанием src */}
      <img 
        src={mainLogo} 
        alt="Main Logo"
        className="loading-logo"
      />
      
      {/* 18+ Badge 
      <div className="loading-badge">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
            <path d="M0 0H22V22H0V0Z" fill="white" />
          </mask>
          <g mask="url(#mask0)">
            <path 
              d="M11 1.56005C5.79505 1.56005 1.56005 5.79505 1.56005 11C1.56005 16.2049 5.79505 20.4399 11 20.4399C16.2049 20.4399 20.4399 16.2049 20.4399 11C20.4399 5.79505 16.2049 1.56005 11 1.56005ZM11 22C9.51557 22 8.07469 21.709 6.71802 21.1355C5.40833 20.5809 4.23156 19.788 3.22151 18.7779C2.21203 17.7684 1.41911 16.5917 0.864531 15.282C0.291042 13.9253 0 12.4844 0 11C0 9.51557 0.291042 8.07469 0.864531 6.71802C1.41911 5.40833 2.21203 4.23156 3.22151 3.22208C4.23156 2.21203 5.40833 1.41911 6.71802 0.864531C8.07469 0.291042 9.51557 0 11 0C12.4844 0 13.9253 0.291042 15.282 0.864531C16.5917 1.41911 17.7684 2.21203 18.7779 3.22208C19.788 4.23156 20.5809 5.40833 21.1355 6.71802C21.709 8.07469 22 9.51557 22 11C22 12.4844 21.709 13.9253 21.1355 15.282C20.5809 16.5917 19.788 17.7684 18.7779 18.7779C17.7684 19.788 16.5917 20.5809 15.282 21.1355C13.9253 21.709 12.4844 22 11 22Z" 
              fill="white" 
              fillOpacity="0.7" 
            />
          </g>
        </svg>
      </div>
      */}
    </div>
  );
}
